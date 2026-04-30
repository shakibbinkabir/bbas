'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LogOut, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';
import type { UserProfile } from '@/types';
import { LogoutButton } from './LogoutButton';

interface ProfileDropdownProps {
  user: UserProfile;
  profileHref: string;
}

export function ProfileDropdown({ user, profileHref }: ProfileDropdownProps) {
  const t = useTranslations();
  const displayName = user.full_name_en || user.full_name_bn || user.email || user.phone;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex h-9 items-center gap-2 px-2"
          aria-label="Open profile menu"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(displayName) || <User className="h-4 w-4" aria-hidden="true" />}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium md:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <Badge variant="secondary" className="text-[10px] uppercase">
            {user.role}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profileHref} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('nav.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="p-0">
          <LogoutButton variant="ghost" className="w-full justify-start gap-2 px-2 py-1.5" />
        </DropdownMenuItem>
        <DropdownMenuSeparator className="hidden" />
        <span className="hidden">
          <LogOut className="h-4 w-4" />
        </span>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
