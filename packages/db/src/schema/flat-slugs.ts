import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { flats } from './flats'

export const flatSlugs = pgTable(
  'flat_slugs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flatId: uuid('flat_id')
      .notNull()
      .unique()
      .references(() => flats.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('flat_slugs_slug_idx').on(table.slug),
  }),
)
