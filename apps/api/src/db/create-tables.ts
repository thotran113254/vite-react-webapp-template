import { queryClient } from "./connection";

async function main() {
  // Check existing tables
  const existing = await queryClient.unsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tables = existing.map((r: any) => r.tablename);
  console.log("Existing tables:", tables.join(", "));

  // Use raw SQL matching Drizzle schema exactly
  // Users
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Resources
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS resources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'inactive',
      category VARCHAR(100) NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}',
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Hotels
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS hotels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      location VARCHAR(255) NOT NULL,
      star_rating INTEGER NOT NULL DEFAULT 5,
      images JSONB NOT NULL DEFAULT '[]',
      amenities JSONB NOT NULL DEFAULT '[]',
      price_from INTEGER NOT NULL DEFAULT 0,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Hotel rooms
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS hotel_rooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
      room_type VARCHAR(100) NOT NULL,
      price_per_night INTEGER NOT NULL DEFAULT 0,
      capacity INTEGER NOT NULL DEFAULT 2,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Bookings
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
      room_id UUID NOT NULL REFERENCES hotel_rooms(id) ON DELETE CASCADE,
      check_in TIMESTAMPTZ NOT NULL,
      check_out TIMESTAMPTZ NOT NULL,
      guests INTEGER NOT NULL DEFAULT 1,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      total_price INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Knowledge base
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      category VARCHAR(100) NOT NULL,
      tags JSONB NOT NULL DEFAULT '[]',
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Chat sessions
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Chat messages
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Pricing rules
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS pricing_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      season_start TIMESTAMPTZ,
      season_end TIMESTAMPTZ,
      multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00,
      min_nights INTEGER DEFAULT 1,
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Trips
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS trips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      destination VARCHAR(200) NOT NULL,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      guests INTEGER NOT NULL DEFAULT 2,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      cover_image TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Itinerary items
  await queryClient.unsafe(`
    CREATE TABLE IF NOT EXISTS itinerary_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL DEFAULT '',
      type VARCHAR(20) NOT NULL,
      title VARCHAR(200) NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      location VARCHAR(300) NOT NULL DEFAULT '',
      confirmation_code VARCHAR(50) NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      metadata JSONB NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Create indexes
  const indexes = [
    "CREATE INDEX IF NOT EXISTS trips_user_id_idx ON trips(user_id)",
    "CREATE INDEX IF NOT EXISTS trips_status_idx ON trips(status)",
    "CREATE INDEX IF NOT EXISTS itinerary_items_trip_id_idx ON itinerary_items(trip_id)",
    "CREATE INDEX IF NOT EXISTS itinerary_items_day_idx ON itinerary_items(trip_id, day_number)",
    "CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings(user_id)",
    "CREATE INDEX IF NOT EXISTS bookings_hotel_id_idx ON bookings(hotel_id)",
    "CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status)",
  ];
  for (const idx of indexes) {
    await queryClient.unsafe(idx);
  }

  console.log("All tables and indexes created successfully");
  await queryClient.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
