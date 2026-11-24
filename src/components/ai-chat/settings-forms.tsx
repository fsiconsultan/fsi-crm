"use client"

import { useState } from "react"
import { saveAutoChat, saveHandover, savePersona } from "@/app/(app)/ai-chat/actions"
import { Card, CardHeader } from "@/components/ui/card"
import { Field, fieldAria, inputClass } from "@/components/ui/field"
import { PillSelect } from "@/components/ui/pill-select"
import { LANGUAGE_MODES, TONES, type ChatSettings } from "@/lib/ai-chat/settings"
import { SaveRow, checkboxClass, textareaClass, useSettingsForm } from "./form-bits"

export function AutoChatCard({ settings }: { settings: ChatSettings }) {
  const { state, pending, onSubmit, errors } = useSettingsForm(saveAutoChat)

  return (
    <Card as="section">
      <CardHeader
        id="auto-chat-title"
        title="Auto chat"
        meta={settings.enabled ? "Saved as on. Nothing answers chats until OpenAI and WhatsApp are connected." : "Saved as off"}
      />
      <form onSubmit={onSubmit} aria-labelledby="auto-chat-title" className="flex flex-col gap-4">
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
            className={checkboxClass}
          />
          <span>
            <span className="font-medium">Let the AI answer new chats</span>
            <span className="block text-[13px] text-muted">
              Chats that start on the website (English and Indonesian) and on WhatsApp.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">Provider</p>
            <p className="flex min-h-11 items-center text-sm">OpenAI</p>
          </div>
          <Field
            label="Model"
            htmlFor="model"
            error={errors.model}
            hint="As OpenAI writes it, for example gpt-4o-mini."
          >
            <input
              id="model"
              name="model"
              defaultValue={settings.model ?? ""}
              autoComplete="off"
              spellCheck={false}
              placeholder="Model name"
              className={inputClass}
              {...fieldAria("model", errors.model, true)}
            />
          </Field>
        </div>

        <p className="text-[13px] text-muted">
          The API key is a server variable (OPENAI_API_KEY) set on Vercel. It is never typed or stored here.
        </p>

        <SaveRow state={state} pending={pending} label="Save" />
      </form>
    </Card>
  )
}

export function PersonaCard({ settings }: { settings: ChatSettings }) {
  const { state, pending, onSubmit, errors } = useSettingsForm(savePersona)
  const [tone, setTone] = useState(settings.tone)

  return (
    <Card as="section">
      <CardHeader id="persona-title" title="Persona" meta="How the AI introduces itself and writes" />
      <form onSubmit={onSubmit} aria-labelledby="persona-title" className="flex flex-col gap-4">
        <Field label="Name in chat" htmlFor="persona_name" error={errors.persona_name}>
          <input
            id="persona_name"
            name="persona_name"
            defaultValue={settings.persona_name}
            className={inputClass}
            {...fieldAria("persona_name", errors.persona_name)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PillSelect
            name="tone"
            label="Tone"
            defaultValue={settings.tone}
            options={TONES.map((t) => ({ value: t.value, label: t.label }))}
            error={errors.tone}
            onChange={setTone}
          />
          <PillSelect
            name="language_mode"
            label="Language"
            defaultValue={settings.language_mode}
            options={LANGUAGE_MODES.map((m) => ({ value: m.value, label: m.label }))}
            error={errors.language_mode}
          />
        </div>

        {tone === "custom" ? (
          <Field label="Describe the tone" htmlFor="tone_custom" error={errors.tone_custom}>
            <textarea
              id="tone_custom"
              name="tone_custom"
              defaultValue={settings.tone_custom ?? ""}
              rows={2}
              className={textareaClass}
              {...fieldAria("tone_custom", errors.tone_custom)}
            />
          </Field>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Greeting in English" htmlFor="greeting_en" error={errors.greeting_en}>
            <textarea
              id="greeting_en"
              name="greeting_en"
              defaultValue={settings.greeting_en ?? ""}
              rows={3}
              className={textareaClass}
              {...fieldAria("greeting_en", errors.greeting_en)}
            />
          </Field>
          <Field label="Greeting in Indonesian" htmlFor="greeting_id" error={errors.greeting_id}>
            <textarea
              id="greeting_id"
              name="greeting_id"
              lang="id"
              defaultValue={settings.greeting_id ?? ""}
              rows={3}
              className={textareaClass}
              {...fieldAria("greeting_id", errors.greeting_id)}
            />
          </Field>
        </div>

        <Field
          label="Rules and forbidden topics"
          htmlFor="rules"
          error={errors.rules}
          hint="One rule per line. These are added to the AI's instructions."
        >
          <textarea
            id="rules"
            name="rules"
            defaultValue={settings.rules ?? ""}
            rows={4}
            className={textareaClass}
            {...fieldAria("rules", errors.rules, true)}
          />
        </Field>

        <SaveRow state={state} pending={pending} label="Save persona" />
      </form>
    </Card>
  )
}

export function HandoverCard({ settings }: { settings: ChatSettings }) {
  const { state, pending, onSubmit, errors } = useSettingsForm(saveHandover)

  return (
    <Card as="section">
      <CardHeader id="handover-title" title="Handover to a person" meta="When the AI stops and a salesperson takes the chat" />
      <form onSubmit={onSubmit} aria-labelledby="handover-title" className="flex flex-col gap-4">
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="handover_on_human_request"
            defaultChecked={settings.handover_on_human_request}
            className={checkboxClass}
          />
          <span>The customer asks for a person</span>
        </label>

        <Field
          label="Failed answers before handing over"
          htmlFor="handover_max_failed_answers"
          error={errors.handover_max_failed_answers}
          hint="Times in a row the AI cannot answer, from 1 to 10."
        >
          <input
            id="handover_max_failed_answers"
            name="handover_max_failed_answers"
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            step={1}
            defaultValue={settings.handover_max_failed_answers}
            className={`${inputClass} max-w-32`}
            {...fieldAria("handover_max_failed_answers", errors.handover_max_failed_answers, true)}
          />
        </Field>

        <Field
          label="Keywords"
          htmlFor="handover_keywords"
          error={errors.handover_keywords}
          hint="One per line or separated by commas, in English and Indonesian. A message containing one goes to a person."
        >
          <textarea
            id="handover_keywords"
            name="handover_keywords"
            defaultValue={settings.handover_keywords.join("\n")}
            rows={4}
            className={textareaClass}
            {...fieldAria("handover_keywords", errors.handover_keywords, true)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Message to the customer, English" htmlFor="handover_message_en" error={errors.handover_message_en}>
            <textarea
              id="handover_message_en"
              name="handover_message_en"
              defaultValue={settings.handover_message_en ?? ""}
              rows={2}
              className={textareaClass}
              {...fieldAria("handover_message_en", errors.handover_message_en)}
            />
          </Field>
          <Field label="Message to the customer, Indonesian" htmlFor="handover_message_id" error={errors.handover_message_id}>
            <textarea
              id="handover_message_id"
              name="handover_message_id"
              lang="id"
              defaultValue={settings.handover_message_id ?? ""}
              rows={2}
              className={textareaClass}
              {...fieldAria("handover_message_id", errors.handover_message_id)}
            />
          </Field>
        </div>

        <SaveRow state={state} pending={pending} label="Save handover rules" />
      </form>
    </Card>
  )
}
