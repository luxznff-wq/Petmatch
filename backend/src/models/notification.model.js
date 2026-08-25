import { isPostgres, query, queryOne } from '../config/database.js';
import { clone, sameId, sequences, store } from './memory-store.js';

const map = (row) =>
  row && {
    id: row.id,
    userId: row.user_id,
    message: row.message,
    link: row.link,
    readAt: row.read_at,
    read: row.read_at != null,
    createdAt: row.created_at
  };

export async function create(userId, message, link = null) {
  if (!isPostgres) {
    const notification = {
      id: sequences.notifications.next(),
      userId: Number(userId),
      message,
      link,
      readAt: null,
      read: false,
      createdAt: new Date().toISOString()
    };
    store.notifications.push(notification);
    return clone(notification);
  }
  return map(
    await queryOne(
      'INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3) RETURNING *',
      [Number(userId), message, link]
    )
  );
}

export async function listByUser(userId, { limit = 50 } = {}) {
  if (!isPostgres) {
    return clone(
      store.notifications
        .filter((notification) => sameId(notification.userId, userId))
        .sort((a, b) => b.id - a.id)
        .slice(0, limit)
    );
  }
  const { rows } = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2',
    [Number(userId) || 0, limit]
  );
  return rows.map(map);
}

export async function countUnread(userId) {
  if (!isPostgres) {
    return store.notifications.filter(
      (notification) => sameId(notification.userId, userId) && notification.readAt == null
    ).length;
  }
  const row = await queryOne(
    'SELECT count(*)::int AS total FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [Number(userId) || 0]
  );
  return row.total;
}

export async function markRead(userId, id) {
  if (!isPostgres) {
    const notification = store.notifications.find(
      (item) => sameId(item.id, id) && sameId(item.userId, userId)
    );
    if (!notification) return null;
    notification.readAt ??= new Date().toISOString();
    notification.read = true;
    return clone(notification);
  }
  return map(
    await queryOne(
      `UPDATE notifications SET read_at = COALESCE(read_at, now())
        WHERE id = $1 AND user_id = $2 RETURNING *`,
      [Number(id) || 0, Number(userId) || 0]
    )
  );
}

export async function markAllRead(userId) {
  if (!isPostgres) {
    store.notifications
      .filter((notification) => sameId(notification.userId, userId))
      .forEach((notification) => {
        notification.readAt ??= new Date().toISOString();
        notification.read = true;
      });
    return;
  }
  await query(
    'UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE user_id = $1',
    [Number(userId) || 0]
  );
}
