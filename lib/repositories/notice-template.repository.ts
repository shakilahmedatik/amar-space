import {
	type Database,
	type DatabaseOrTransaction,
	noticeTemplates,
} from "@repo/db";
import { and, count, desc, eq } from "drizzle-orm";
import { BaseRepository } from "./scoped-query";

export class NoticeTemplateRepository extends BaseRepository {
	list(ownerAccountId: string) {
		return Promise.all([
			this.db
				.select()
				.from(noticeTemplates)
				.where(eq(noticeTemplates.ownerAccountId, ownerAccountId))
				.orderBy(desc(noticeTemplates.updatedAt)),
			this.db
				.select({ count: count() })
				.from(noticeTemplates)
				.where(eq(noticeTemplates.ownerAccountId, ownerAccountId)),
		]);
	}

	findById(id: string, ownerAccountId: string, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client.query.noticeTemplates.findFirst({
			where: and(
				eq(noticeTemplates.id, id),
				eq(noticeTemplates.ownerAccountId, ownerAccountId),
			),
		});
	}

	create(
		data: typeof noticeTemplates.$inferInsert,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client.insert(noticeTemplates).values(data).returning();
	}

	update(
		id: string,
		data: Partial<typeof noticeTemplates.$inferInsert>,
		ownerAccountId: string,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client
			.update(noticeTemplates)
			.set({ ...data, updatedAt: new Date() })
			.where(
				and(
					eq(noticeTemplates.id, id),
					eq(noticeTemplates.ownerAccountId, ownerAccountId),
				),
			)
			.returning();
	}

	delete(id: string, ownerAccountId: string, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client
			.delete(noticeTemplates)
			.where(
				and(
					eq(noticeTemplates.id, id),
					eq(noticeTemplates.ownerAccountId, ownerAccountId),
				),
			);
	}
}
