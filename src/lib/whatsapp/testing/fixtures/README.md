# Webhook fixtures

FSI has no WhatsApp Business number yet, so nothing could be recorded from a
live webhook. These files follow the payload examples in Meta's Cloud API
webhook reference, with placeholder ids and a made-up test number. Replace them
with real recordings (customer details removed) once the number is live.

- `text-message.json`: one inbound text message.
- `statuses.json`: delivery updates for outbound messages, including a failure
  with error 131047 (outside the 24-hour window).
- `unknown-types.json`: message types the app does not read (image, reaction,
  and a type that does not exist), plus a malformed entry.
