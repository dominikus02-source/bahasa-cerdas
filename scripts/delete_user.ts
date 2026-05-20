import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const email = "obahmamah.indonesia@gmail.com";
  
  // Find user in Prisma
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, supabaseId: true, fullName: true, email: true },
  });
  
  if (!user) {
    console.log(`User not found: ${email}`);
    return;
  }
  
  console.log(`Found user: ${user.fullName} (${user.id})`);
  
  // Delete from Supabase Auth
  if (user.supabaseId) {
    const { error: authError } = await supabase.auth.admin.deleteUser(user.supabaseId);
    if (authError) {
      console.log(`Supabase auth delete error: ${authError.message}`);
    } else {
      console.log(`Deleted from Supabase Auth: ${user.supabaseId}`);
    }
  }
  
  // Delete from Prisma (cascade should handle related records)
  await prisma.user.delete({ where: { id: user.id } });
  console.log(`Deleted from database: ${user.id}`);
  
  console.log("\nUser deleted successfully!");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
