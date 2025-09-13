import React from "react";
import { Building2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const wrapperVariants = cva("rounded-xl flex items-center justify-center shadow-lg", {
    variants: {
        variant: {
            blue: "bg-gradient-to-br from-blue-600 to-indigo-700",
            indigo: "bg-gradient-to-br from-indigo-600 to-indigo-800",
            green: "bg-gradient-to-br from-emerald-500 to-green-700",
            red: "bg-gradient-to-br from-rose-500 to-red-700",
            purple: "bg-gradient-to-br from-violet-500 to-purple-700",
            teal: "bg-gradient-to-br from-teal-500 to-cyan-600",
            white: "bg-gradient-to-br from-gray-200 to-gray-400",
        },
        size: {
            sm: "w-9 h-9",
            md: "w-12 h-12",
            lg: "w-14 h-14",
        },
    },
    defaultVariants: {
        variant: "blue",
        size: "md",
    },
});

const iconVariants = cva("text-white shrink-0", {
    variants: {
        size: {
            sm: "h-4 w-4",
            md: "h-7 w-7",
            lg: "h-8 w-8",
        },
    },
    defaultVariants: {
        size: "md",
    },
});

const titleVariants = cva("font-bold bg-clip-text text-transparent bg-gradient-to-r", {
    variants: {
        variant: {
            blue: "from-blue-600 to-indigo-600",
            indigo: "from-indigo-600 to-indigo-800",
            green: "from-emerald-500 to-green-600",
            red: "from-rose-500 to-red-600",
            purple: "from-violet-500 to-purple-600",
            teal: "from-teal-500 to-cyan-500",
            white: "text-white",
        },
        size: {
            sm: "text-sm",
            md: "text-2xl",
            lg: "text-3xl",
        },
    },
    defaultVariants: {
        variant: "blue",
        size: "md",
    },
});

type LogoVariantProps = VariantProps<typeof wrapperVariants> & VariantProps<typeof iconVariants> & VariantProps<typeof titleVariants>;

interface LogoProps extends LogoVariantProps {
    showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ variant = "blue", size = "md", showText = true }) => {
    return (
        <div className="flex items-center space-x-3">
            <div className={cn(wrapperVariants({ variant, size }))}>
                <Building2 className={cn(iconVariants({ size }))} />
            </div>

            {showText && (
                <div>
                    <h1 className={cn(titleVariants({ variant, size }))}>Zopkit</h1>
                    <p className="text-xs text-muted-accent -mt-1">Business Suite</p>
                </div>
            )}
        </div>
    );
};

export default Logo;
