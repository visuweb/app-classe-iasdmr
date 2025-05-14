import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormControlLabelProps extends React.ComponentPropsWithoutRef<"div"> {
  control: React.ReactElement;
  label: React.ReactNode;
  disabled?: boolean;
}

export const FormControlLabel = React.forwardRef<HTMLDivElement, FormControlLabelProps>(
  ({ control, label, className, disabled, ...props }, ref) => {
    // Clone control element with disabled prop
    const controlElement = React.cloneElement(control, {
      disabled: disabled || control.props.disabled,
    });

    return (
      <div 
        ref={ref}
        className={cn("flex items-center gap-2", className)} 
        {...props}
      >
        {controlElement}
        <Label
          className={cn(
            "cursor-pointer",
            disabled && "cursor-not-allowed opacity-70"
          )}
        >
          {label}
        </Label>
      </div>
    );
  }
);

FormControlLabel.displayName = "FormControlLabel"; 