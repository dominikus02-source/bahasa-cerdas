# [GENERATE_COMPONENT]
Model: Big Pickle
"Buat React Server Component untuk [NAMA_FEATURE] dengan:
- Props interface TypeScript
- Tailwind styling konsisten dengan design system
- Loading & error state
- Export default
File: src/components/[folder]/[Component].tsx"

# [API_ENDPOINT]
Model: MiniMax M2.5
"Buat Next.js API Route di /api/[path]/route.ts dengan:
- Method: POST
- Validation pakai zod
- Auth check pakai getServerSession
- Prisma query dengan error handling
- Return JSON standar {success, data, error}"

# [PRISMA_MIGRATION]
Model: MiniMax M2.5
"Buat model Prisma untuk [NAMA_ENTITY] dengan:
- Field: id, createdAt, updatedAt, relasi ke User
- Index untuk query frequent
- Enum jika diperlukan
File: prisma/schema.prisma"