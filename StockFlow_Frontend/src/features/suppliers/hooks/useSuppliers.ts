'use client';

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { message, Modal } from 'antd';
import { supplierService } from '../services/supplierService';
import { exportSuppliersToXLSX } from '../utils/exportExcel';
import { parseSuppliersFromExcel } from '../utils/importExcel';
import {
  Supplier,
  SupplierDetail,
  SupplierFilterState,
  WarehouseOption,
} from '../types';
import { useAuthorizedWarehouses } from '@/lib/warehouse/useActiveWarehouse';

/** Mở sẵn từ link (?code=NCC...&id=...): điền ô tìm kiếm + mở dòng chi tiết NCC */
export interface SupplierInitialLink {
  search?: string;
  expandId?: number | null;
}

export function useSuppliers(initial?: SupplierInitialLink) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Filter State
  const [filterState, setFilterState] = useState<SupplierFilterState>({
    search: initial?.search ?? '',
    debtStatus: 'ALL',
    status: 'ALL',
    warehouseId: 'ALL',
    timeRange: 'all_time',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  // Bộ lọc "Chi nhánh nhập" chỉ gồm các kho tài khoản được phân quyền (Admin: tất cả)
  const { warehouses: warehousesList } = useAuthorizedWarehouses();

  // Selection & Pagination State
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Accordion Expand State & Cache
  const [expandedRowKey, setExpandedRowKey] = useState<number | null>(initial?.expandId ?? null);
  const [detailsCache, setDetailsCache] = useState<Record<number, SupplierDetail>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(initial?.expandId ?? null);
  // Dòng đang mở, đọc trong effect khi màn hiện lại (không đưa vào deps để effect chỉ chạy lúc hiện màn)
  const expandedRowRef = useRef<number | null>(expandedRowKey);
  useEffect(() => {
    expandedRowRef.current = expandedRowKey;
  }, [expandedRowKey]);

  // Next 16 (cacheComponents) không gỡ màn khi chuyển trang mà ẩn bằng <Activity>: state giữ nguyên, effect chạy lại
  // khi quay lại. Danh sách tự tải lại nhưng chi tiết NCC đang mở thì không → sau khi nhập hàng / thanh toán ở màn
  // khác, quay lại vẫn thấy lịch sử và sổ nợ cũ. Nên khi màn bị ẩn: bỏ chi tiết đã nạp, đánh dấu dòng đang mở là đang tải.
  useLayoutEffect(
    () => () => {
      setDetailsCache({});
      setLoadingDetailId(expandedRowRef.current);
    },
    []
  );

  // Khi màn hiện (lần đầu – kể cả mở sẵn NCC theo link – và mỗi lần quay lại): nạp chi tiết của dòng đang mở
  useEffect(() => {
    const id = expandedRowRef.current;
    if (!id) return;
    let cancelled = false;
    supplierService
      .getSupplierById(id)
      .then((detail) => {
        if (!cancelled) setDetailsCache((prev) => ({ ...prev, [id]: detail }));
      })
      .catch(() => {
        if (!cancelled) message.error('Không thể tải chi tiết nhà cung cấp.');
      })
      .finally(() => {
        if (!cancelled) setLoadingDetailId((cur) => (cur === id ? null : cur));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Tải danh sách nhà cung cấp từ API
  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await supplierService.getSuppliers({
        search: filterState.search,
        debtStatus: filterState.debtStatus,
        status: filterState.status,
        warehouseId: filterState.warehouseId,
        fromDate: filterState.dateFrom,
        toDate: filterState.dateTo,
      });
      // Nhà cung cấp mới tạo (ID lớn nhất) luôn nằm trên đầu danh sách
      setSuppliers([...data].sort((a, b) => b.partnerId - a.partnerId));
    } catch (e: any) {
      message.error(e?.message || 'Không thể tải danh sách nhà cung cấp từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [filterState.debtStatus, filterState.status, filterState.warehouseId, filterState.dateFrom, filterState.dateTo]);

  // 3. Lọc dữ liệu client-side (địa chỉ/tỉnh thành & từ khóa tìm kiếm)
  const filteredSuppliers = useMemo(() => {
    let result = suppliers;

    if (selectedLocation !== 'ALL') {
      result = result.filter(
        (s) => s.address && s.address.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    if (filterState.search.trim()) {
      const q = filterState.search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          (s.code && s.code.toLowerCase().includes(q)) ||
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.phone && s.phone.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
      );
    }

    return result;
  }, [suppliers, selectedLocation, filterState.search]);

  const selectedWarehouse = useMemo<WarehouseOption | null>(() => {
    if (filterState.warehouseId === 'ALL') return null;
    return warehousesList.find((w) => w.warehouseId === filterState.warehouseId) || null;
  }, [filterState.warehouseId, warehousesList]);

  // 4. Tổng nợ cần trả hiển thị trên thanh thống kê
  const totalPayableDebt = useMemo(() => {
    if (selectedWarehouse) {
      return filteredSuppliers.reduce(
        (sum, s) => sum + (s.branchPayable !== undefined ? s.branchPayable : (s.currentPayable || 0)),
        0
      );
    }
    return filteredSuppliers.reduce((sum, s) => sum + (s.currentPayable || 0), 0);
  }, [filteredSuppliers, selectedWarehouse]);

  // 5. Phân trang
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const rangeStart = filteredSuppliers.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filteredSuppliers.length);

  // 6. Xử lý mở/đóng dòng mở rộng hạ xuống (Inline Accordion)
  const handleRowClick = async (sup: Supplier) => {
    if (expandedRowKey === sup.partnerId) {
      setExpandedRowKey(null);
      return;
    }

    setExpandedRowKey(sup.partnerId);

    // Nếu chưa có trong cache thì nạp từ API
    if (!detailsCache[sup.partnerId]) {
      try {
        setLoadingDetailId(sup.partnerId);
        const detail = await supplierService.getSupplierById(sup.partnerId);
        setDetailsCache((prev) => ({ ...prev, [sup.partnerId]: detail }));
      } catch (err: any) {
        message.error(`Không thể tải chi tiết nhà cung cấp #${sup.code}`);
      } finally {
        setLoadingDetailId(null);
      }
    }
  };

  // 6b. Sau khi thanh toán / thay đổi công nợ: tải lại chi tiết NCC đang mở + danh sách
  const handlePaymentCreated = async (partnerId: number, voucherCode: string) => {
    message.success(`Đã tạo phiếu chi ${voucherCode}`);
    try {
      const detail = await supplierService.getSupplierById(partnerId);
      setDetailsCache((prev) => ({ ...prev, [partnerId]: detail }));
    } catch {
      setDetailsCache((prev) => {
        const next = { ...prev };
        delete next[partnerId];
        return next;
      });
    }
    loadSuppliers();
  };

  // 6c. Sau khi tạo / sửa / xóa phiếu điều chỉnh công nợ: tải lại chi tiết NCC đang mở + danh sách
  const handleDataChanged = async (partnerId: number) => {
    try {
      const detail = await supplierService.getSupplierById(partnerId);
      setDetailsCache((prev) => ({ ...prev, [partnerId]: detail }));
    } catch {
      setDetailsCache((prev) => {
        const next = { ...prev };
        delete next[partnerId];
        return next;
      });
    }
    loadSuppliers();
  };

  // 7. Handlers lọc
  const handleFilterChange = (patch: Partial<SupplierFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterState({
      search: '',
      debtStatus: 'ALL',
      status: 'ALL',
      warehouseId: 'ALL',
      timeRange: 'all_time',
      dateFrom: '',
      dateTo: '',
    });
    setSelectedLocation('ALL');
    setPage(1);
  };

  // 8. Handlers Thao tác đơn lẻ
  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (partnerId: number) => {
    try {
      const res = await supplierService.toggleSupplierStatus(partnerId);
      message.success(
        res.isActive
          ? 'Đã chuyển nhà cung cấp sang Đang giao dịch!'
          : 'Đã chuyển nhà cung cấp sang Ngừng giao dịch!'
      );
      // Xóa cache chi tiết để lần sau mở sẽ lấy trạng thái mới
      setDetailsCache((prev) => {
        const next = { ...prev };
        delete next[partnerId];
        return next;
      });
      loadSuppliers();
    } catch (e: any) {
      message.error(e?.message || 'Có lỗi khi thay đổi trạng thái.');
    }
  };

  const handleDelete = (sup: Supplier) => {
    Modal.confirm({
      title: 'Xác nhận xóa Nhà cung cấp',
      content: `Bạn có chắc chắn muốn xóa nhà cung cấp ${sup.name} (${sup.code})? Nếu nhà cung cấp đã có chứng từ nhập kho hoặc còn dư nợ, hệ thống sẽ tự động chuyển sang Ngừng giao dịch để bảo vệ dữ liệu kế toán.`,
      okText: 'Xác nhận',
      cancelText: 'Hủy bỏ',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await supplierService.deleteSupplier(sup.partnerId);
          message.success('Thao tác xóa / ngừng giao dịch nhà cung cấp thành công!');
          if (expandedRowKey === sup.partnerId) {
            setExpandedRowKey(null);
          }
          loadSuppliers();
        } catch (e: any) {
          message.error(e?.message || 'Có lỗi xảy ra khi xóa nhà cung cấp.');
        }
      },
    });
  };

  const handleExportExcel = () => {
    if (filteredSuppliers.length === 0) {
      message.warning('Không có dữ liệu nhà cung cấp để xuất file.');
      return;
    }
    exportSuppliersToXLSX(
      filteredSuppliers,
      undefined,
      selectedWarehouse ? selectedWarehouse.name : undefined
    );
    message.success(`Đã xuất thành công file Excel (${filteredSuppliers.length} nhà cung cấp)!`);
  };

  // 8b. Import danh sách nhà cung cấp từ file Excel (định dạng giống file Xuất file)
  const [importing, setImporting] = useState<boolean>(false);
  const handleImportExcel = async (file: File) => {
    setImporting(true);
    try {
      const { rows, skippedNoName } = await parseSuppliersFromExcel(file);
      const existingCodes = new Set(suppliers.map((s) => s.code.toUpperCase()));

      let created = 0;
      const skippedExisting: number[] = [];
      const failed: string[] = [];

      // Tạo tuần tự để mã NCC tự sinh không bị trùng
      for (const row of rows) {
        if (row.payload.code && existingCodes.has(row.payload.code.toUpperCase())) {
          skippedExisting.push(row.rowNumber);
          continue;
        }
        try {
          await supplierService.createSupplier(row.payload);
          created++;
          if (row.payload.code) existingCodes.add(row.payload.code.toUpperCase());
        } catch (err) {
          failed.push(`Dòng ${row.rowNumber}: ${err instanceof Error ? err.message : 'lỗi không xác định'}`);
        }
      }

      const notes = [
        skippedExisting.length ? `${skippedExisting.length} dòng trùng mã đã có` : '',
        skippedNoName.length ? `${skippedNoName.length} dòng thiếu tên` : '',
        failed.length ? `${failed.length} dòng lỗi` : '',
      ].filter(Boolean);

      if (created > 0) {
        message.success(
          `Đã import ${created} nhà cung cấp${notes.length ? ` (bỏ qua: ${notes.join(', ')})` : ''}.`
        );
        loadSuppliers();
      } else {
        message.warning(`Không có nhà cung cấp nào được import${notes.length ? `: ${notes.join(', ')}` : ''}.`);
      }
      if (failed.length > 0) {
        console.warn('Import nhà cung cấp - các dòng lỗi:', failed);
        message.error(failed.slice(0, 3).join(' | '));
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không đọc được file Excel.');
    } finally {
      setImporting(false);
    }
  };

  // 9. Handlers Thao tác hàng loạt (Bulk Actions)
  const handleBulkExportExcel = () => {
    const selectedSuppliers = suppliers.filter((s) => selectedRowKeys.includes(s.id));
    if (selectedSuppliers.length === 0) return;
    exportSuppliersToXLSX(
      selectedSuppliers,
      `danh_sach_${selectedSuppliers.length}_ncc_da_chon.xlsx`,
      selectedWarehouse ? selectedWarehouse.name : undefined
    );
    message.success(`Đã xuất file Excel cho ${selectedSuppliers.length} nhà cung cấp đã chọn!`);
  };

  const handleBulkChangeStatus = (targetStatus: 'ACTIVE' | 'INACTIVE') => {
    const isDeactivating = targetStatus === 'INACTIVE';
    const selectedSuppliers = suppliers.filter((s) => selectedRowKeys.includes(s.id));
    const toUpdate = selectedSuppliers.filter((s) => s.status !== targetStatus);

    if (toUpdate.length === 0) {
      message.info(
        `Tất cả ${selectedSuppliers.length} nhà cung cấp được chọn đã ở trạng thái ${
          isDeactivating ? 'Ngừng giao dịch' : 'Đang giao dịch'
        }.`
      );
      return;
    }

    Modal.confirm({
      title: isDeactivating
        ? 'Xác nhận ngừng giao dịch hàng loạt'
        : 'Xác nhận kích hoạt lại hàng loạt',
      content: `Bạn có chắc chắn muốn chuyển trạng thái của ${toUpdate.length} nhà cung cấp đã chọn sang "${
        isDeactivating ? 'Ngừng giao dịch' : 'Đang giao dịch'
      }"?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      okButtonProps: { danger: isDeactivating },
      onOk: async () => {
        try {
          for (const sup of toUpdate) {
            await supplierService.updateSupplier(sup.partnerId, {
              name: sup.name,
              isActive: !isDeactivating,
            });
          }
          message.success(
            `Đã chuyển trạng thái ${toUpdate.length} nhà cung cấp sang "${
              isDeactivating ? 'Ngừng giao dịch' : 'Đang giao dịch'
            }" thành công!`
          );
          setSelectedRowKeys([]);
          setDetailsCache({});
          loadSuppliers();
        } catch (e: any) {
          message.error(e?.message || 'Có lỗi xảy ra khi cập nhật trạng thái hàng loạt.');
        }
      },
    });
  };

  return {
    suppliers,
    loading,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileFilterOpen,
    setMobileFilterOpen,
    filterState,
    selectedLocation,
    setSelectedLocation,
    warehousesList,
    selectedWarehouse,
    selectedRowKeys,
    setSelectedRowKeys,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    rangeStart,
    rangeEnd,
    pagedItems,
    filteredSuppliers,
    totalPayableDebt,
    isModalOpen,
    setIsModalOpen,
    editingSupplier,
    expandedRowKey,
    detailsCache,
    loadingDetailId,
    loadSuppliers,
    handleRowClick,
    handlePaymentCreated,
    handleDataChanged,
    handleFilterChange,
    handleResetFilters,
    handleOpenCreate,
    handleOpenEdit,
    handleToggleStatus,
    handleDelete,
    handleExportExcel,
    importing,
    handleImportExcel,
    handleBulkExportExcel,
    handleBulkChangeStatus,
  };
}
