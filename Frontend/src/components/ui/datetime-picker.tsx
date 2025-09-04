'use client';

import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export function DateTimePicker({
  date,
  setDate,
  className,
  placeholder = 'Pick a date and time',
  disabled = false,
  name,
  onBlur,
  onFocus,
  ...props
}: DateTimePickerProps) {
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value; // e.g., "14:30"
    if (!date || !time) return;

    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes);
    setDate(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className // Apply custom classes
          )}
          disabled={disabled}
          name={name}
          onBlur={onBlur}
          onFocus={onFocus}
          {...props}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP HH:mm') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={{ before: new Date() }}
          autoFocus
        />
        <div className="p-3 border-t border-border">
          <Label>Time</Label>
          <Input
            type="time"
            value={date ? format(date, 'HH:mm') : ''}
            onChange={handleTimeChange}
            min={
              date && date.toDateString() === new Date().toDateString()
                ? format(new Date(), 'HH:mm')
                : undefined
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
