import { count, eq, sql, desc, gte } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { users } from "../../db/schema/users-schema.js";
import { resources } from "../../db/schema/resources-schema.js";
import { hotels } from "../../db/schema/hotels-schema.js";
import { hotelRooms } from "../../db/schema/hotel-rooms-schema.js";
import { bookings } from "../../db/schema/bookings-schema.js";
import { knowledgeBase } from "../../db/schema/knowledge-base-schema.js";
import { chatSessions } from "../../db/schema/chat-sessions-schema.js";

export interface DashboardStats {
  users: { total: number; admins: number; regularUsers: number };
  resources: { total: number; active: number; inactive: number; pending: number; error: number };
  hotels: { total: number; totalRooms: number; avgStarRating: number };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    totalRevenue: number;
    avgBookingValue: number;
  };
  knowledgeBase: { total: number; published: number; draft: number };
  chatSessions: { total: number };
  recentBookings: Array<{
    id: string;
    hotelName: string;
    status: string;
    totalPrice: number;
    checkIn: string;
    checkOut: string;
    guests: number;
    createdAt: string;
  }>;
  topHotels: Array<{
    id: string;
    name: string;
    location: string;
    starRating: number;
    bookingCount: number;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Run all queries in parallel for performance
  const [
    userStats,
    resourceStats,
    hotelCount,
    roomCount,
    avgStars,
    bookingStats,
    revenueStats,
    kbStats,
    chatCount,
    recentBookingRows,
    topHotelRows,
  ] = await Promise.all([
    // User stats
    db
      .select({
        total: count(),
        admins: count(sql`CASE WHEN ${users.role} = 'admin' THEN 1 END`),
      })
      .from(users),

    // Resource stats by status
    db
      .select({
        status: resources.status,
        cnt: count(),
      })
      .from(resources)
      .groupBy(resources.status),

    // Hotel count
    db.select({ total: count() }).from(hotels),

    // Room count
    db.select({ total: count() }).from(hotelRooms),

    // Avg star rating
    db
      .select({
        avg: sql<number>`COALESCE(AVG(${hotels.starRating}), 0)`,
      })
      .from(hotels),

    // Booking stats by status
    db
      .select({
        status: bookings.status,
        cnt: count(),
      })
      .from(bookings)
      .groupBy(bookings.status),

    // Revenue stats
    db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${bookings.totalPrice}), 0)`,
        avgValue: sql<number>`COALESCE(AVG(${bookings.totalPrice}), 0)`,
      })
      .from(bookings),

    // Knowledge base stats
    db
      .select({
        status: knowledgeBase.status,
        cnt: count(),
      })
      .from(knowledgeBase)
      .groupBy(knowledgeBase.status),

    // Chat session count
    db.select({ total: count() }).from(chatSessions),

    // Recent bookings with hotel name
    db
      .select({
        id: bookings.id,
        hotelName: hotels.name,
        status: bookings.status,
        totalPrice: bookings.totalPrice,
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        guests: bookings.guests,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .leftJoin(hotels, eq(bookings.hotelId, hotels.id))
      .orderBy(desc(bookings.createdAt))
      .limit(5),

    // Top hotels by booking count
    db
      .select({
        id: hotels.id,
        name: hotels.name,
        location: hotels.location,
        starRating: hotels.starRating,
        bookingCount: count(bookings.id),
      })
      .from(hotels)
      .leftJoin(bookings, eq(hotels.id, bookings.hotelId))
      .groupBy(hotels.id, hotels.name, hotels.location, hotels.starRating)
      .orderBy(desc(count(bookings.id)))
      .limit(5),
  ]);

  // Parse resource stats
  const resourceMap: Record<string, number> = {};
  for (const r of resourceStats) {
    resourceMap[r.status] = r.cnt;
  }

  // Parse booking stats
  const bookingMap: Record<string, number> = {};
  for (const b of bookingStats) {
    bookingMap[b.status] = b.cnt;
  }
  const totalBookings = Object.values(bookingMap).reduce((a, b) => a + b, 0);

  // Parse KB stats
  const kbMap: Record<string, number> = {};
  for (const k of kbStats) {
    kbMap[k.status] = k.cnt;
  }
  const totalKb = Object.values(kbMap).reduce((a, b) => a + b, 0);

  return {
    users: {
      total: userStats[0]!.total,
      admins: userStats[0]!.admins,
      regularUsers: userStats[0]!.total - userStats[0]!.admins,
    },
    resources: {
      total: Object.values(resourceMap).reduce((a, b) => a + b, 0),
      active: resourceMap["active"] ?? 0,
      inactive: resourceMap["inactive"] ?? 0,
      pending: resourceMap["pending"] ?? 0,
      error: resourceMap["error"] ?? 0,
    },
    hotels: {
      total: hotelCount[0]!.total,
      totalRooms: roomCount[0]!.total,
      avgStarRating: Math.round(Number(avgStars[0]!.avg) * 10) / 10,
    },
    bookings: {
      total: totalBookings,
      pending: bookingMap["pending"] ?? 0,
      confirmed: bookingMap["confirmed"] ?? 0,
      cancelled: bookingMap["cancelled"] ?? 0,
      completed: bookingMap["completed"] ?? 0,
      totalRevenue: Number(revenueStats[0]!.totalRevenue),
      avgBookingValue: Math.round(Number(revenueStats[0]!.avgValue)),
    },
    knowledgeBase: {
      total: totalKb,
      published: kbMap["published"] ?? 0,
      draft: kbMap["draft"] ?? 0,
    },
    chatSessions: {
      total: chatCount[0]!.total,
    },
    recentBookings: recentBookingRows.map((r) => ({
      id: r.id,
      hotelName: r.hotelName ?? "Unknown",
      status: r.status,
      totalPrice: r.totalPrice,
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut.toISOString(),
      guests: r.guests,
      createdAt: r.createdAt.toISOString(),
    })),
    topHotels: topHotelRows.map((h) => ({
      id: h.id,
      name: h.name,
      location: h.location,
      starRating: h.starRating,
      bookingCount: h.bookingCount,
    })),
  };
}
