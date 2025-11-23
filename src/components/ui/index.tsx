import React from 'react'
import {
  Button as WorldButton,
  Typography as WorldTypography,
} from '@worldcoin/mini-apps-ui-kit-react'
import { cn } from '../../utils/cn'

// Squid Game Neobrutalist Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'teal' | 'green' | 'pink'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'font-squid-heading font-bold transition-all duration-150 focus:outline-none uppercase tracking-wider touch-manipulation'
    
    const variantClasses: Record<string, string> = {
      primary: 'text-squid-white border-4 border-squid-black',
      secondary: 'text-squid-white border-3 border-squid-border',
      danger: 'text-squid-white border-4 border-squid-black',
      ghost: 'text-squid-white border-3 border-squid-border',
      teal: 'text-squid-black border-4 border-squid-black',
      green: 'text-squid-black border-4 border-squid-black',
      pink: 'text-squid-black border-4 border-squid-black'
    }
    
    const sizeClasses: Record<string, string> = {
      sm: 'px-4 py-2.5 text-sm min-h-[44px] rounded-lg',
      md: 'px-6 py-3.5 text-base min-h-[52px] rounded-lg',
      lg: 'px-8 py-4 text-lg min-h-[60px] rounded-xl'
    }
    
    const getButtonStyle = (variant: string, disabled?: boolean) => {
      if (disabled) {
        return {
          background: '#2D2D35',
          boxShadow: '2px 2px 0px 0px #0A0A0F',
          color: '#666',
          cursor: 'not-allowed'
        }
      }
      
      const shadows = {
        normal: '4px 4px 0px 0px #0A0A0F',
        active: '2px 2px 0px 0px #0A0A0F'
      }
      
      switch (variant) {
        case 'primary':
          return {
            background: '#FF1F8C',
            boxShadow: shadows.normal,
          }
        case 'pink':
          return {
            background: '#FF1F8C',
            boxShadow: shadows.normal,
          }
        case 'teal':
          return {
            background: '#00D9C0',
            boxShadow: shadows.normal,
          }
        case 'green':
          return {
            background: '#00A878',
            boxShadow: shadows.normal,
          }
        case 'danger':
          return {
            background: '#DC143C',
            boxShadow: shadows.normal,
          }
        case 'secondary':
          return {
            background: '#1A1A20',
            boxShadow: shadows.normal,
          }
        default:
          return {
            background: 'transparent',
            boxShadow: 'none',
          }
      }
    }
    
    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!props.disabled) {
        e.currentTarget.style.transform = 'translate(2px, 2px)'
        e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
      }
      props.onPointerDown?.(e)
    }
    
    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!props.disabled) {
        e.currentTarget.style.transform = 'translate(0, 0)'
        const style = getButtonStyle(variant, false)
        e.currentTarget.style.boxShadow = style.boxShadow || '4px 4px 0px 0px #0A0A0F'
      }
      props.onPointerUp?.(e)
    }
    
    return (
      <WorldButton
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        style={getButtonStyle(variant, props.disabled)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        {...props}
      >
        {children}
      </WorldButton>
    )
  }
)
Button.displayName = 'Button'

// Squid Game Neobrutalist Card Component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'game' | 'stats' | 'pink' | 'teal'
  noBrutal?: boolean
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', noBrutal = false, children, ...props }, ref) => {
    const baseClasses = 'font-squid rounded-lg transition-all duration-150'
    const brutalClasses = noBrutal ? '' : 'border-3 border-squid-black'
    
    const variantClasses: Record<string, string> = {
      default: 'bg-squid-gray',
      elevated: 'bg-squid-gray hover:translate-x-[-2px] hover:translate-y-[-2px]',
      game: 'bg-squid-gray',
      stats: 'bg-squid-gray',
      pink: 'bg-squid-pink/10 border-squid-pink',
      teal: 'bg-squid-teal/10 border-squid-teal',
    }
    
    const getCardStyle = (variant: string) => {
      if (noBrutal) {
        return {}
      }
      
      const shadows: Record<string, string> = {
        default: '3px 3px 0px 0px #0A0A0F',
        elevated: '4px 4px 0px 0px #0A0A0F',
        game: '4px 4px 0px 0px #00A878',
        stats: '4px 4px 0px 0px #00D9C0',
        pink: '4px 4px 0px 0px #FF1F8C',
        teal: '4px 4px 0px 0px #00D9C0',
      }
      
      return {
        boxShadow: shadows[variant] || shadows.default
      }
    }
    
    return (
      <div
        ref={ref}
        className={cn(baseClasses, brutalClasses, variantClasses[variant], className)}
        style={getCardStyle(variant)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'

// Squid Game Typography Component
interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label' | 'score'
  color?: 'primary' | 'secondary' | 'accent' | 'muted' | 'pink' | 'teal' | 'green'
  neon?: boolean
  children?: React.ReactNode
}

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant = 'body', color = 'primary', neon = false, children, ...props }, ref) => {
    const colorClasses = {
      primary: 'text-squid-white',
      secondary: 'text-squid-white/80',
      accent: 'text-squid-pink',
      muted: 'text-squid-white/60',
      pink: 'text-squid-pink',
      teal: 'text-squid-teal',
      green: 'text-squid-green'
    }
    
    const neonClasses = {
      pink: 'neon-text-pink',
      teal: 'neon-text-teal',
      green: 'neon-text-green',
      accent: 'neon-text-pink'
    }
    
    const variantClasses = {
      h1: 'font-squid-heading text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-wider leading-tight',
      h2: 'font-squid-heading text-2xl sm:text-3xl font-bold uppercase tracking-wide',
      h3: 'font-squid-heading text-xl sm:text-2xl font-bold uppercase tracking-wide',
      h4: 'font-squid text-lg sm:text-xl font-bold',
      body: 'font-squid text-sm sm:text-base',
      caption: 'font-squid text-xs sm:text-sm',
      label: 'font-squid text-xs sm:text-sm font-semibold uppercase tracking-wide',
      score: 'font-squid-mono text-base sm:text-lg font-bold tabular-nums'
    }
    
    return (
      <WorldTypography
        ref={ref}
        className={cn(
          variantClasses[variant],
          neon && color in neonClasses ? neonClasses[color as keyof typeof neonClasses] : colorClasses[color],
          className
        )}
        {...props}
      >
        {children}
      </WorldTypography>
    )
  }
)
Typography.displayName = 'Typography'

// Container component following World's spacing guidelines
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, spacing = 'md', children, ...props }, ref) => {
    const spacingClasses = {
      sm: 'space-y-2 sm:space-y-3',
      md: 'space-y-3 sm:space-y-4 md:space-y-6',
      lg: 'space-y-4 sm:space-y-6 md:space-y-8',
      xl: 'space-y-6 sm:space-y-8 md:space-y-12'
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          spacingClasses[spacing],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Container.displayName = 'Container'

// Stack component for consistent spacing
interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column'
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ 
    className, 
    direction = 'column', 
    spacing = 'md', 
    align = 'stretch',
    justify = 'start',
    children, 
    ...props 
  }, ref) => {
    const directionClasses = {
      row: 'flex-row',
      column: 'flex-col'
    }
    
    const spacingClasses = {
      row: {
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-3 sm:gap-4',
        lg: 'gap-4 sm:gap-6',
        xl: 'gap-6 sm:gap-8'
      },
      column: {
        xs: 'space-y-1',
        sm: 'space-y-2',
        md: 'space-y-3 sm:space-y-4',
        lg: 'space-y-4 sm:space-y-6',
        xl: 'space-y-6 sm:space-y-8'
      }
    }
    
    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch'
    }
    
    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly'
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          directionClasses[direction],
          spacingClasses[direction][spacing],
          alignClasses[align],
          justifyClasses[justify],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Stack.displayName = 'Stack'
Stack.displayName = 'Stack'