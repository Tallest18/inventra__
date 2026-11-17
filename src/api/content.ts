// src/api/content.ts
// Admin-editable content (Django admin → "App content"): Help & Support FAQs,
// support contacts and the Privacy Policy. Public endpoints, no sign-in needed.
import { apiClient } from "./client";

export interface SupportContact {
  whatsapp_number: string;
  whatsapp_url: string;
  whatsapp_message: string;
  email: string;
}

export interface HelpContent {
  intro: string;
  help_title: string;
  help_text: string;
  faqs: { id: number; question: string; answer: string }[];
  contact: SupportContact;
}

export interface PrivacyPolicyContent {
  intro: string;
  last_updated: string | null;
  last_updated_label: string;
  sections: { number: number; title: string; body: string }[];
  contact_text: string;
  contact: SupportContact;
}

export async function getHelpContent(): Promise<HelpContent> {
  const { data } = await apiClient.get<HelpContent>("/content/help/");
  return data;
}

export async function getPrivacyPolicy(): Promise<PrivacyPolicyContent> {
  const { data } = await apiClient.get<PrivacyPolicyContent>("/content/privacy-policy/");
  return data;
}

/** wa.me link with the admin's pre-filled message. */
export const whatsappLink = (c: SupportContact) =>
  c.whatsapp_message ? `${c.whatsapp_url}?text=${encodeURIComponent(c.whatsapp_message)}` : c.whatsapp_url;
