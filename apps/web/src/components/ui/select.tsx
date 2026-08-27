import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;
export const SelectTrigger = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) => <SelectPrimitive.Trigger className={cn("ui-select-trigger", className)} {...props}>{children}<ChevronDown size={16} /></SelectPrimitive.Trigger>;
export const SelectContent = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) => <SelectPrimitive.Portal><SelectPrimitive.Content className={cn("ui-select-content", className)} position="popper" {...props}><SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>;
export const SelectItem = ({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) => <SelectPrimitive.Item className={cn("ui-select-item", className)} {...props}><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator><Check size={15} /></SelectPrimitive.ItemIndicator></SelectPrimitive.Item>;
