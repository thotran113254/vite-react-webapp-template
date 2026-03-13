import { queryClient } from "./connection";

async function main() {
  await queryClient.unsafe("DROP TABLE IF EXISTS itinerary_items CASCADE");
  await queryClient.unsafe("DROP TABLE IF EXISTS trips CASCADE");
  await queryClient.unsafe("DROP TABLE IF EXISTS chat_messages CASCADE");
  await queryClient.unsafe("DROP TABLE IF EXISTS chat_sessions CASCADE");
  await queryClient.unsafe("DROP TABLE IF EXISTS pricing_rules CASCADE");
  await queryClient.unsafe("DROP TABLE IF EXISTS bookings CASCADE");
  await queryClient.unsafe("DROP TABLE IF EXISTS hotel_rooms CASCADE");
  await queryClient.unsafe("DROP TABLE IF EXISTS hotels CASCADE");
  await queryClient.unsafe("DROP TABLE IF EXISTS knowledge_base CASCADE");
  await queryClient.unsafe("DROP TABLE IF EXISTS resources CASCADE");
  await queryClient.unsafe("DROP TABLE IF EXISTS users CASCADE");
  console.log("Dropped all app tables");
  await queryClient.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
