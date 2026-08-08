"use client";

import KuisTempurSolo from "@/components/game/KuisTempurSolo";

export default function GuruKuisTempurPage() {
  return (
    <div className="fixed inset-0 z-[60]">
      <KuisTempurSolo backHref="/guru/game" />
    </div>
  );
}
