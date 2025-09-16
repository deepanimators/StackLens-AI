import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MultiSelectOption {
  id: string;
  label: string;
  value: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (selectedValues: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  maxDisplayCount?: number;
  className?: string;
  disabled?: boolean;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  maxDisplayCount = 3,
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle selection toggle
  const toggleSelection = (value: string) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newSelection);
  };

  // Handle select all
  const selectAll = () => {
    onSelectionChange(filteredOptions.map((option) => option.value));
  };

  // Handle clear all
  const clearAll = () => {
    onSelectionChange([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Get display text for selected items
  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    
    if (selectedValues.length === 1) {
      const selectedOption = options.find((opt) => opt.value === selectedValues[0]);
      return selectedOption?.label || selectedValues[0];
    }
    
    if (selectedValues.length <= maxDisplayCount) {
      return selectedValues
        .map((value) => {
          const option = options.find((opt) => opt.value === value);
          return option?.label || value;
        })
        .join(", ");
    }
    
    return `${selectedValues.length} files selected`;
  };

  // Get selected options for badge display
  const getSelectedOptions = () => {
    return selectedValues
      .map((value) => options.find((opt) => opt.value === value))
      .filter(Boolean) as MultiSelectOption[];
  };

  const selectedOptions = getSelectedOptions();

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        variant="outline"
        className={`w-full justify-between ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="truncate text-left">{getDisplayText()}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>

      {/* Selected Items Badges (shown below trigger when items are selected) */}
      {selectedValues.length > 0 && selectedValues.length <= maxDisplayCount && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedOptions.map((option) => (
            <Badge
              key={option.id}
              variant="secondary"
              className="text-xs flex items-center gap-1"
            >
              {option.label}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(option.value);
                }}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-82">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Action Buttons */}
          {filteredOptions.length > 0 && (
            <div className="flex justify-between p-2 border-b bg-muted/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="text-xs"
              >
                Select All ({filteredOptions.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs"
                disabled={selectedValues.length === 0}
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {searchQuery ? "No files found" : "No files available"}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.id}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent transition-colors ${
                      isSelected ? "bg-accent" : ""
                    }`}
                    onClick={() => toggleSelection(option.value)}
                  >
                    <span className="truncate flex-1">{option.label}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with selection count */}
          {selectedValues.length > 0 && (
            <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground text-center">
              {selectedValues.length} file{selectedValues.length !== 1 ? "s" : ""} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
