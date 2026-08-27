import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuItem = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>) => <DropdownMenuPrimitive.Item className={cn("ui-dropdown-item", className)} {...props} />;
export const DropdownMenuContent = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) => <DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content sideOffset={8} className={cn("ui-dropdown-content", className)} {...props} /></DropdownMenuPrimitive.Portal>;
