"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip/Chip";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import styles from "./orders-table.module.css";

/**
 * Example prototype — an admin orders table on test data.
 * Shows what a code screen can do that a picture can't: filter, search, select rows, hit the empty state.
 * Copy this folder to start a new prototype.
 */
type Status = "Active" | "Pending" | "Blocked";
const ORDERS: { id: string; client: string; manager: string; total: number; status: Status }[] = [
  { id: "ORD-1042", client: "Northwind Logistics", manager: "Anna Kovalenko", total: 12480, status: "Active" },
  { id: "ORD-1041", client: "Blue Harbor Foods", manager: "Daniel Weber", total: 3920, status: "Pending" },
  { id: "ORD-1040", client: "Maximilian Alexander Construction GmbH", manager: "Olena Petrenko", total: 87300, status: "Active" },
  { id: "ORD-1039", client: "Kite & Co", manager: "Mark Levin", total: 640, status: "Blocked" },
  { id: "ORD-1038", client: "Atlas Pharma", manager: "Anna Kovalenko", total: 21050, status: "Active" },
  { id: "ORD-1037", client: "Greenline Energy", manager: "Daniel Weber", total: 9100, status: "Pending" },
  { id: "ORD-1036", client: "Orbit Retail", manager: "Olena Petrenko", total: 15775, status: "Active" },
  { id: "ORD-1035", client: "Polar Freight", manager: "Mark Levin", total: 4300, status: "Blocked" },
];
const FILTERS = ["All", "Active", "Pending", "Blocked"] as const;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function OrdersTable() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ORDERS.filter(
      (o) => (filter === "All" || o.status === filter) && (!q || `${o.id} ${o.client} ${o.manager}`.toLowerCase().includes(q)),
    );
  }, [filter, query]);
  const count = (f: (typeof FILTERS)[number]) => (f === "All" ? ORDERS.length : ORDERS.filter((o) => o.status === f).length);
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)));

  return (
    <div className={styles.app}>
      <header className={styles.top}>
        <div>
          <p className="mono-xs">Sales · Orders</p>
          <h1 className="heading-h2">Orders</h1>
        </div>
        <SearchField label="Search orders" placeholder="Search by order, client or manager" value={query} onChange={(e) => setQuery(e.target.value)} className={styles.search} />
      </header>

      <div className={styles.bar}>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <Chip key={f} selected={filter === f} count={count(f)} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>
        <p className={`mono-xs ${styles.picked}`} data-on={picked.size > 0 || undefined}>
          {picked.size} selected
        </p>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.check}>
                <input type="checkbox" aria-label="Select all" checked={allPicked} onChange={toggleAll} />
              </th>
              <th>Order</th>
              <th>Client</th>
              <th>Manager</th>
              <th className={styles.num}>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} data-picked={picked.has(o.id) || undefined} onClick={() => toggle(o.id)}>
                <td className={styles.check}>
                  <input type="checkbox" aria-label={`Select ${o.id}`} checked={picked.has(o.id)} onChange={() => toggle(o.id)} onClick={(e) => e.stopPropagation()} />
                </td>
                <td className="mono-s">{o.id}</td>
                <td className={styles.client}>{o.client}</td>
                <td>{o.manager}</td>
                <td className={styles.num}>{money.format(o.total)}</td>
                <td>
                  <span className={styles.status} data-status={o.status}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className={styles.empty}>
            <p className="heading-h3">No orders match</p>
            <p className="body-s">Try another word or clear the filters.</p>
            <button
              type="button"
              className={`mono-s ${styles.reset}`}
              onClick={() => {
                setQuery("");
                setFilter("All");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
