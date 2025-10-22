"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface EnhancedSearchableSelectOption {
  value: string;
  label: string;
  searchText?: string; // Additional text to search on (e.g., store number + name)
}

interface EnhancedSearchableSelectProps {
  options: EnhancedSearchableSelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  onAddNew?: (searchValue: string) => Promise<void> | void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  addNewText?: string;
  addNewIcon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  allowAddNew?: boolean;
}

export function EnhancedSearchableSelect({
  options,
  value,
  onValueChange,
  onAddNew,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyText = "No options found.",
  addNewText = "Add New",
  addNewIcon,
  className,
  disabled = false,
  id,
  allowAddNew = false,
}: EnhancedSearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  // Check if search value matches any existing option
  const hasExactMatch = React.useMemo(() => {
    if (!searchValue.trim()) return true;
    return options.some(
      (option) =>
        option.value.toLowerCase() === searchValue.toLowerCase() ||
        option.label.toLowerCase() === searchValue.toLowerCase() ||
        (option.searchText && 
         option.searchText.toLowerCase().includes(searchValue.toLowerCase()))
    );
  }, [options, searchValue]);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue.trim()) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
        option.value.toLowerCase().includes(searchValue.toLowerCase()) ||
        (option.searchText && 
         option.searchText.toLowerCase().includes(searchValue.toLowerCase()))
    );
  }, [options, searchValue]);

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === value) {
      onValueChange?.("");
    } else {
      onValueChange?.(selectedValue);
    }
    setOpen(false);
    setSearchValue("");
  };

  const handleAddNew = async () => {
    if (!onAddNew || !searchValue.trim() || isAdding) return;
    
    setIsAdding(true);
    try {
      await onAddNew(searchValue.trim());
      setSearchValue("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to add new item:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchValue("");
    }
  };

  const showAddNew = allowAddNew && 
                    searchValue.trim() && 
                    !hasExactMatch && 
                    onAddNew &&
                    filteredOptions.length === 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedOption && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredOptions.length === 0 && !showAddNew && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            
            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {showAddNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleAddNew}
                  className="cursor-pointer text-primary"
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                  ) : (
                    addNewIcon || <Plus className="mr-2 h-4 w-4" />
                  )}
                  {isAdding ? "Adding..." : `${addNewText} "${searchValue}"`}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}