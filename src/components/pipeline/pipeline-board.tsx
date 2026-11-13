"use client"

import Link from "next/link"
import { useReducer, useRef, useState, type DragEvent, type ReactNode } from "react"
import { ChevronDown, X } from "lucide-react"
import { changeLeadStatus } from "@/app/(app)/leads/actions"
import { loadMoreColumn } from "@/app/(app)/pipeline/actions"
import { Chip } from "@/components/inbox/chips"
import { dayCount } from "@/components/leads/format"
import { Button } from "@/components/ui/button"
import { Dialog, DialogFooter } from "@/components/ui/dialog"
import { Menu, menuItemClass } from "@/components/ui/menu"
import { cn } from "@/lib/cn"
import { LEAD_STATUSES, LEAD_STATUS_SHORT, type LeadStatus } from "@/lib/leads/status"
import { toneStyle } from "@/lib/leads/status-tone"
import { pipelineHref, type PipelineFilters } from "@/lib/pipeline/filters"
import {
  boardReducer,
  hasMore,
  initialBoard,
  nextOffset,
  performMove,
  type BoardAction,
  type ColumnState,
  type Move,
  type Notice,
} from "./board-state"
import type { BoardData, Mover, PipelineLead } from "./types"

type Dragging = { leadId: number; from: LeadStatus }

// The two statuses that close a lead: moving into them asks first.
const CLOSING: Partial<Record<LeadStatus, string>> = {
  "Deal": "It will count as a deal won from today.",
  "No Deal": "It will count as lost from today.",
}

const laneDrop: Record<"idle" | "target", string> = {
  idle: "outline-transparent",
  target: "outline-accent",
}

const cardState: Record<"idle" | "busy", string> = {
  idle: "",
  busy: "opacity-60",
}

const MOVER_LABEL: Record<Mover, string> = { ai: "AI", person: "Person" }

const noticeTone: Record<Notice["kind"], string> = {
  moved: "bg-surface-raised",
  info: "bg-surface-raised",
  error: "bg-negative-soft",
}

function cardDomId(leadId: number) {
  return `pipeline-lead-${leadId}`
}

export function PipelineBoard({
  initial,
  filters,
}: {
  initial: BoardData
  /** The filters the board was loaded with; "Show more" loads the next page under the same ones. */
  filters: PipelineFilters
}) {
  const [state, dispatch] = useReducer(boardReducer, initial, initialBoard)
  const [confirming, setConfirming] = useState<{ lead: PipelineLead; move: Move } | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [dragging, setDragging] = useState<Dragging | null>(null)
  const [over, setOver] = useState<LeadStatus | null>(null)
  // A card moved from the keyboard or the menu remounts in another column; this
  // names the card that should get focus back once it is there.
  const focusAfterMove = useRef<number | null>(null)

  const focusMovedCard = () => {
    const id = focusAfterMove.current
    if (id === null) return
    const link = document.getElementById(cardDomId(id))
    link?.focus()
    if (link && document.activeElement === link) focusAfterMove.current = null
  }

  const run = (move: Move, keepFocus: boolean) => {
    if (keepFocus) focusAfterMove.current = move.leadId
    // A refused move puts the card back in its old column, so focus follows it there too.
    const report = (action: BoardAction) => {
      if (keepFocus && action.type === "move_failed") focusAfterMove.current = move.leadId
      dispatch(action)
    }
    return performMove(report, changeLeadStatus, move)
  }

  const requestMove = (lead: PipelineLead, from: LeadStatus, to: LeadStatus, keepFocus: boolean) => {
    if (from === to || state.moving[lead.id]) return
    const move = { leadId: lead.id, from, to }
    if (CLOSING[to]) {
      if (keepFocus) focusAfterMove.current = lead.id
      setConfirming({ lead, move })
    } else {
      void run(move, keepFocus)
    }
  }

  const confirmMove = async () => {
    if (!confirming) return
    setConfirmBusy(true)
    await run(confirming.move, focusAfterMove.current === confirming.lead.id)
    setConfirmBusy(false)
    setConfirming(null)
  }

  // Cancel keeps focus where the browser returns it: on the card's Move to button.
  const cancelConfirm = () => {
    focusAfterMove.current = null
    setConfirming(null)
  }

  const undo = (notice: Extract<Notice, { kind: "moved" }>) =>
    void run({ leadId: notice.leadId, from: notice.to, to: notice.from, undo: true }, true)

  const showMore = async (status: LeadStatus) => {
    dispatch({ type: "more_started", status })
    const result = await loadMoreColumn(status, filters, nextOffset(state.columns[status])).catch(() => null)
    if (result?.ok) dispatch({ type: "more_loaded", status, page: result.page })
    else {
      dispatch({
        type: "more_failed",
        status,
        message: result?.message ?? "More leads could not be loaded. Check your connection and try again.",
      })
    }
  }

  const drop = (status: LeadStatus) => {
    const source = dragging
    setDragging(null)
    setOver(null)
    if (!source || source.from === status) return
    const lead = state.columns[source.from].cards.find((card) => card.id === source.leadId)
    if (lead) requestMove(lead, source.from, status, false)
  }

  const widest = Math.max(...LEAD_STATUSES.map((status) => state.columns[status].total), 1)

  return (
    <div className="relative">
      <div aria-live="polite" className="sticky top-2 z-20">
        {state.notice ? (
          <BoardNotice notice={state.notice} onUndo={undo} onDismiss={() => dispatch({ type: "notice_dismissed" })} />
        ) : null}
      </div>

      {/* The board scrolls sideways inside itself, never the page. On a phone each column is
          most of the screen wide and snaps into place. The padding keeps focus rings unclipped. */}
      <div
        role="group"
        aria-label="Pipeline board, one column per status"
        className="-m-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain p-1 md:snap-none"
      >
        {LEAD_STATUSES.map((status) => (
          <Lane
            key={status}
            status={status}
            column={state.columns[status]}
            share={state.columns[status].total / widest}
            filtered={pipelineHref(filters) !== "/pipeline"}
            dropState={dragging && over === status && dragging.from !== status ? "target" : "idle"}
            onDragOver={(event) => {
              if (!dragging) return
              event.preventDefault()
              event.dataTransfer.dropEffect = dragging.from === status ? "none" : "move"
              if (over !== status) setOver(status)
            }}
            onDrop={(event) => {
              event.preventDefault()
              drop(status)
            }}
            onShowMore={() => void showMore(status)}
          >
            {state.columns[status].cards.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                status={status}
                busy={!!state.moving[lead.id]}
                onMove={(to) => requestMove(lead, status, to, true)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", lead.name)
                  focusAfterMove.current = null
                  setDragging({ leadId: lead.id, from: status })
                }}
                onDragEnd={() => {
                  setDragging(null)
                  setOver(null)
                }}
                focusRef={(node) => {
                  if (node && focusAfterMove.current === lead.id) focusMovedCard()
                }}
              />
            ))}
          </Lane>
        ))}
      </div>

      <Dialog
        open={confirming !== null}
        onClose={cancelConfirm}
        onClosed={focusMovedCard}
        busy={confirmBusy}
        title={confirming ? `Move ${confirming.lead.name} to ${LEAD_STATUS_SHORT[confirming.move.to]}?` : ""}
        description={
          confirming
            ? `${CLOSING[confirming.move.to]} You can move it to another status later, but its days in status start again.`
            : undefined
        }
      >
        <DialogFooter>
          <Button variant="secondary" onClick={cancelConfirm} disabled={confirmBusy} data-autofocus>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void confirmMove()} disabled={confirmBusy}>
            {confirmBusy ? "Moving…" : `Move to ${confirming ? LEAD_STATUS_SHORT[confirming.move.to] : ""}`}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function BoardNotice({
  notice,
  onUndo,
  onDismiss,
}: {
  notice: Notice
  onUndo: (notice: Extract<Notice, { kind: "moved" }>) => void
  onDismiss: () => void
}) {
  return (
    <div
      role={notice.kind === "error" ? "alert" : "status"}
      className={cn(
        "relative mb-3 flex items-center justify-between gap-2 overflow-hidden rounded-[var(--radius-control)] border border-line py-1 pl-4 pr-1 text-sm shadow-xl",
        noticeTone[notice.kind],
      )}
    >
      <NoticeText notice={notice} />
      <div className="flex shrink-0 items-center gap-1">
        {notice.kind === "moved" ? (
          <Button variant="secondary" onClick={() => onUndo(notice)}>
            Undo
          </Button>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="flex size-11 items-center justify-center rounded-[var(--radius-control)] hover:bg-surface-sunken md:size-10"
        >
          <X aria-hidden="true" className="size-4" />
          <span className="sr-only">Dismiss message</span>
        </button>
      </div>
      {notice.kind === "moved" ? (
        // CSS runs the 8 second countdown (globals.css); its end takes the Undo away.
        <span
          aria-hidden="true"
          onAnimationEnd={onDismiss}
          className="undo-countdown absolute inset-x-0 bottom-0 h-0.5 bg-muted"
        />
      ) : null}
    </div>
  )
}

function NoticeText({ notice }: { notice: Notice }) {
  if (notice.kind === "moved") {
    return (
      <p className="min-w-0 py-2">
        <span className="font-medium">Moved. </span>
        {notice.name} is now in {LEAD_STATUS_SHORT[notice.to]}.
      </p>
    )
  }
  if (notice.kind === "error") {
    return (
      <p className="min-w-0 py-2">
        <span className="font-medium text-negative">Failed. </span>
        {notice.message}
      </p>
    )
  }
  return <p className="min-w-0 py-2">{notice.message}</p>
}

function Lane({
  status,
  column,
  share,
  filtered,
  dropState,
  onDragOver,
  onDrop,
  onShowMore,
  children,
}: {
  status: LeadStatus
  column: ColumnState
  /** This column's count against the largest column, 0 to 1. */
  share: number
  /** A filter is on, so an empty column means "no match", not "no leads". */
  filtered: boolean
  dropState: "idle" | "target"
  onDragOver: (event: DragEvent<HTMLElement>) => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onShowMore: () => void
  children: ReactNode
}) {
  const label = LEAD_STATUS_SHORT[status]
  const left = column.total - column.cards.length

  return (
    <section
      aria-label={`${label}, ${column.total.toLocaleString("en-US")} leads`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={toneStyle(status)}
      className={cn(
        // Each column is a card of the page (DESIGN.md: flat, 20px radius) and scrolls inside
        // itself at a fixed height, never one taken from the window.
        "flex max-h-[560px] w-[85vw] max-w-[340px] shrink-0 snap-center flex-col tone-lane rounded-[var(--radius-card)] border border-line outline-2 -outline-offset-2 transition-[outline-color] duration-[120ms] md:h-[640px] md:max-h-none md:w-[280px]",
        laneDrop[dropState],
      )}
    >
      <header className="px-3 pt-3 pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <span aria-hidden="true" className="tone-dot size-2 shrink-0 rounded-full" />
            <span className="truncate">{label}</span>
          </h3>
          <span className="shrink-0 text-xs tabular-nums text-muted">{column.total.toLocaleString("en-US")}</span>
        </div>
        <div aria-hidden="true" className="mt-2 h-1.5">
          <div
            className="tone-dot h-full rounded-full"
            style={{ width: `${share * 100}%`, minWidth: column.total > 0 ? 6 : 0 }}
          />
        </div>
      </header>

      {/* `relative` keeps the screen-reader-only text of the buttons inside this scroller;
          without it that text is placed against the page and stretches the page's height. */}
      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-2">
        {column.cards.length === 0 ? (
          <p className="px-1 py-3 text-xs text-muted">
            {filtered ? "No lead in this status matches the filters." : "No leads in this status."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">{children}</ul>
        )}

        {column.loadError ? (
          <p role="alert" className="mt-2 rounded-[8px] bg-negative-soft px-3 py-2 text-xs text-ink">
            {column.loadError}
          </p>
        ) : null}
        {hasMore(column) ? (
          <Button variant="ghost" onClick={onShowMore} disabled={column.loading} className="mt-2 w-full text-[13px]">
            {column.loading ? "Loading…" : `Show more (${left.toLocaleString("en-US")} left)`}
            <span className="sr-only"> in {label}</span>
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function LeadCard({
  lead,
  status,
  busy,
  onMove,
  onDragStart,
  onDragEnd,
  focusRef,
}: {
  lead: PipelineLead
  status: LeadStatus
  /** A move is on its way to the server. */
  busy: boolean
  onMove: (to: LeadStatus) => void
  onDragStart: (event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  focusRef: (node: HTMLAnchorElement | null) => void
}) {
  const place = [lead.business, lead.location].filter(Boolean).join(" · ")

  return (
    <li>
      <article
        draggable={!busy}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        aria-busy={busy}
        style={toneStyle(status)}
        className={cn(
          "tone-card relative rounded-[12px] border p-3 transition-[border-color] duration-[120ms] hover:[border-color:color-mix(in_srgb,var(--tone)_55%,var(--line))]",
          // No CSS filter here: a filter turns the card into the containing block for the
          // fixed-position "Move to" menu and pushes the menu off screen.
          cardState[busy ? "busy" : "idle"],
        )}
      >
        {/* The name link covers the card; the Move to button sits above it. */}
        <Link
          ref={focusRef}
          id={cardDomId(lead.id)}
          href={`/customers/${lead.id}`}
          draggable={false}
          className="block text-sm font-medium leading-5 after:absolute after:inset-0 after:rounded-[12px]"
        >
          <span className="line-clamp-2 break-words">{lead.name}</span>
        </Link>
        {place ? <p className="mt-0.5 truncate text-xs text-muted">{place}</p> : null}

        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-muted">
          <span>{lead.daysInStatus === null ? "Status date unknown" : `${dayCount(lead.daysInStatus)} in status`}</span>
          <FollowUp followUp={lead.followUp} />
        </p>

        <div className="mt-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-muted">{lead.owner}</p>
          {lead.mover ? (
            <Chip>
              <span className="sr-only">Status last set by </span>
              {MOVER_LABEL[lead.mover]}
            </Chip>
          ) : null}
          <Menu
            label={`Move ${lead.name} to`}
            placement="floating"
            triggerLabel={`Move to another status: ${lead.name}`}
            triggerClassName="relative z-10 -mr-1 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[8px] px-2 text-xs font-medium text-ink transition-colors duration-[120ms] hover:bg-surface-sunken md:min-h-8"
            trigger={
              <>
                Move to
                <ChevronDown aria-hidden="true" className="size-3.5 text-muted" strokeWidth={1.75} />
              </>
            }
          >
            {(close) =>
              LEAD_STATUSES.filter((option) => option !== status).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-disabled={busy}
                  onClick={() => {
                    close()
                    if (!busy) onMove(option)
                  }}
                  className={menuItemClass}
                >
                  {LEAD_STATUS_SHORT[option]}
                </button>
              ))
            }
          </Menu>
        </div>
      </article>
    </li>
  )
}

function FollowUp({ followUp }: { followUp: PipelineLead["followUp"] }) {
  if (!followUp) return null
  if (followUp.overdue) return <Chip tone="negative">Follow-up overdue, {followUp.label}</Chip>
  return <span>Follow-up {followUp.label}</span>
}
