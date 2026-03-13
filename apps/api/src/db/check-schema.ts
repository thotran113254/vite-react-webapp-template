import { queryClient } from "./connection";

async function main() {
  const cols = await queryClient.unsafe(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
  );
  console.log("users columns:");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of cols) console.log(`  ${(c as any).column_name}: ${(c as any).data_type}`);
  await queryClient.end();
}

main().catch(console.error);
