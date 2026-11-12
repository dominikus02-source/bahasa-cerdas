export type LedgerDto = {
  id: string;
  entryDate: string;
  type: "PEMASUKAN" | "PENGELUARAN";
  amount: number;
  description: string;
  category: string | null;
  createdById: string | null;
  createdByEmail: string;
  updatedById: string | null;
  updatedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
};
