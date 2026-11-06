/** wa.me opens WhatsApp with the message ready; the person picks the chat. */
export function whatsappHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
