import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn, whatsAppLink } from "@/lib/utils";

export function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
  size = "sm",
  variant = "outline",
  className,
}: {
  phone: string;
  message: string;
  label?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "outline" | "secondary" | "ghost" | "default";
  className?: string;
}) {
  return (
    <a
      href={whatsAppLink(phone, message)}
      target="_blank"
      rel="noreferrer"
      className={cn(buttonVariants({ variant, size }), className)}
      onClick={(e) => e.stopPropagation()}
    >
      <MessageCircle className="h-4 w-4 text-[#25D366]" />
      {label}
    </a>
  );
}
