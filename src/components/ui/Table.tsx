import { cn } from "@/lib/utils"

interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-[var(--surface-border)]", className)}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  )
}

interface TableHeaderProps {
  children: React.ReactNode
  className?: string
}

export function TableHeader({ children, className = "" }: TableHeaderProps) {
  return (
    <thead>
      <tr className={cn("border-b border-[var(--surface-border)] bg-[var(--surface-raised)]", className)}>
        {children}
      </tr>
    </thead>
  )
}

interface TableHeaderCellProps {
  children: React.ReactNode
  className?: string
}

export function TableHeaderCell({ children, className = "" }: TableHeaderCellProps) {
  return (
    <th className={cn("px-5 py-3 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap", className)}>
      {children}
    </th>
  )
}

interface TableBodyProps {
  children: React.ReactNode
  className?: string
}

export function TableBody({ children, className = "" }: TableBodyProps) {
  return (
    <tbody className={cn("divide-y divide-[var(--surface-border)]", className)}>
      {children}
    </tbody>
  )
}

interface TableRowProps {
  children: React.ReactNode
  className?: string
}

export function TableRow({ children, className = "" }: TableRowProps) {
  return (
    <tr className={cn("bg-[var(--background)] hover:bg-[var(--surface-overlay)] transition-colors duration-100", className)}>
      {children}
    </tr>
  )
}

interface TableCellProps {
  children: React.ReactNode
  className?: string
}

export function TableCell({ children, className = "" }: TableCellProps) {
  return (
    <td className={cn("px-5 py-3", className)}>
      {children}
    </td>
  )
}

interface TableEmptyRowProps {
  colSpan: number
  children?: React.ReactNode
  className?: string
}

export function TableEmptyRow({ colSpan, children, className = "" }: TableEmptyRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn("px-5 py-10 text-center text-sm text-[var(--muted)]", className)}>
        {children ?? "No data"}
      </td>
    </tr>
  )
}
