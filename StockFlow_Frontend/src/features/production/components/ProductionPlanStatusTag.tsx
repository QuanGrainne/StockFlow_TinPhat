'use client';

import React from 'react';
import type { ProductionPlanStatus } from '../types';
import { PLAN_STATUS_CLS, PLAN_STATUS_LABEL } from '../utils/productionPlanFormat';

export function ProductionPlanStatusTag({ status }: { status: ProductionPlanStatus }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
        PLAN_STATUS_CLS[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
      }`}
    >
      {PLAN_STATUS_LABEL[status] ?? status}
    </span>
  );
}
