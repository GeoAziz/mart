
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, ShieldAlert, Trash2, UserX, MoreHorizontal, CheckCircle, UserCog, Loader2, Filter, Edit3, Mail, Lock, User as UserIconLucide, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, type UserProfile, type Role } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const userEditSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters.").optional(),
  role: z.enum(['customer', 'vendor', 'admin'] as [Role, ...Role[]]), // Ensure enum values match Role type
  status: z.enum(['active', 'pending_approval', 'suspended'] as [UserProfile['status'], ...UserProfile['status'][]]),
});

type UserEditFormData = z.infer<typeof userEditSchema>;

const userCreateSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(['customer', 'vendor', 'admin'] as [Role, ...Role[]]),
  status: z.enum(['active', 'pending_approval', 'suspended'] as [UserProfile['status'], ...UserProfile['status'][]]),
});

type UserCreateFormData = z.infer<typeof userCreateSchema>;


const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-500/20 text-green-300 border-green-400';
    case 'suspended':
      return 'bg-red-500/20 text-red-300 border-red-400';
    case 'pending_approval':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-300 border-purple-400';
      case 'vendor':
        return 'bg-blue-500/20 text-blue-300 border-blue-400';
      case 'customer':
        return 'bg-teal-500/20 text-teal-300 border-teal-400';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});
  
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isEditFormSubmitting, setIsEditFormSubmitting] = useState(false);

  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isCreateFormSubmitting, setIsCreateFormSubmitting] = useState(false);

  const { currentUser } = useAuth();
  const { toast } = useToast();

  const editUserForm = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    mode: 'onChange',
  });

  const createUserForm = useForm<UserCreateFormData>({
    resolver: zodResolver(userCreateSchema),
    mode: 'onChange',
    defaultValues: {
      role: 'customer',
      status: 'active',
    }
  });

  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }
      const data: UserProfile[] = await response.json();
      setUsers(data.map(u => ({
        ...u,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt) : undefined
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Could not load users.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (editingUser && isEditUserDialogOpen) {
      editUserForm.reset({
        fullName: editingUser.fullName || '',
        role: editingUser.role,
        status: editingUser.status,
      });
    }
  }, [editingUser, isEditUserDialogOpen, editUserForm]);

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'approveVendor' | 'delete') => {
    if (!currentUser) return;
    setActionLoading(prev => ({ ...prev, [userId]: true }));

    let method = 'PUT';
    let endpoint = `/api/users/${userId}`;
    let payload: any = {};
    let successMessage = '';

    switch (action) {
      case 'suspend':
        payload = { status: 'suspended' };
        successMessage = 'User suspended successfully.';
        break;
      case 'activate':
        payload = { status: 'active' };
        successMessage = 'User activated successfully.';
        break;
      case 'approveVendor':
        payload = { role: 'vendor', status: 'active' }; 
        successMessage = 'Vendor approved and activated successfully.';
        break;
      case 'delete':
        method = 'DELETE';
        successMessage = 'User deleted successfully.';
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
           setActionLoading(prev => ({ ...prev, [userId]: false }));
           return;
        }
        break;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: method !== 'DELETE' ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} user.`);
      }
      
      toast({ title: 'Success', description: successMessage });
      fetchUsers(); 
    } catch (error) {
      console.error(`Error ${action} user ${userId}:`, error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : `Could not ${action} user.`, variant: 'destructive' });
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };
  
  const openEditUserDialog = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditUserDialogOpen(true);
  };
  
  const openCreateUserDialog = () => {
    createUserForm.reset(); // Reset form to default values
    setIsCreateUserDialogOpen(true);
  };


  const handleEditUserSubmit = async (data: UserEditFormData) => {
    if (!editingUser || !currentUser) return;
    setIsEditFormSubmitting(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/users/${editingUser.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user profile.');
      }
      toast({ title: 'User Updated', description: `Profile for ${data.fullName || editingUser.email} updated.`});
      setIsEditUserDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error(`Error updating user ${editingUser.uid}:`, error);
      toast({ title: 'Update Failed', description: error instanceof Error ? error.message : 'Could not update user.', variant: 'destructive' });
    } finally {
      setIsEditFormSubmitting(false);
    }
  };

  const handleCreateUserSubmit = async (data: UserCreateFormData) => {
    if (!currentUser) return;
    setIsCreateFormSubmitting(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user.');
      }
      toast({ title: 'User Created', description: `User ${data.email} has been successfully created.`});
      setIsCreateUserDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error(`Error creating user:`, error);
      toast({ title: 'Creation Failed', description: error instanceof Error ? error.message : 'Could not create user.', variant: 'destructive' });
    } finally {
      setIsCreateFormSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={(isOpen) => { setIsEditUserDialogOpen(isOpen); if (!isOpen) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-md bg-card border-primary shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-glow-accent">Edit User: {editingUser?.fullName || editingUser?.email}</DialogTitle>
            <DialogDescription>Update the user's details below. Email cannot be changed.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={editUserForm.handleSubmit(handleEditUserSubmit)} className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input 
                  id="edit-fullName" 
                  {...editUserForm.register("fullName")}
                  className={`bg-input border-primary focus:ring-accent ${editUserForm.formState.errors.fullName ? 'border-destructive' : ''}`} 
                  disabled={isEditFormSubmitting}
                />
                {editUserForm.formState.errors.fullName && <p className="text-xs text-destructive">{editUserForm.formState.errors.fullName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" value={editingUser.email || ''} readOnly disabled className="bg-muted border-border cursor-not-allowed"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-role">Role</Label>
                <Controller
                  name="role"
                  control={editUserForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditFormSubmitting || editingUser.uid === currentUser?.uid}>
                      <SelectTrigger id="edit-role" className={`bg-input border-primary focus:ring-accent ${editUserForm.formState.errors.role ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-primary">
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {editingUser.uid === currentUser?.uid && <p className="text-xs text-muted-foreground">Admins cannot change their own role.</p>}
                {editUserForm.formState.errors.role && <p className="text-xs text-destructive">{editUserForm.formState.errors.role.message}</p>}
              </div>
               <div className="space-y-1">
                <Label htmlFor="edit-status">Status</Label>
                 <Controller
                  name="status"
                  control={editUserForm.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditFormSubmitting || (editingUser.uid === currentUser?.uid && editingUser.role === 'admin')}>
                      <SelectTrigger id="edit-status" className={`bg-input border-primary focus:ring-accent ${editUserForm.formState.errors.status ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-primary">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending_approval">Pending Approval</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {(editingUser.uid === currentUser?.uid && editingUser.role === 'admin') && <p className="text-xs text-muted-foreground">Active admins cannot change their own status.</p>}
                {editUserForm.formState.errors.status && <p className="text-xs text-destructive">{editUserForm.formState.errors.status.message}</p>}
              </div>
              <DialogFooter className="mt-2">
                <DialogClose asChild><Button type="button" variant="ghost" disabled={isEditFormSubmitting}>Cancel</Button></DialogClose>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isEditFormSubmitting || !editUserForm.formState.isDirty || !editUserForm.formState.isValid}>
                  {isEditFormSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Create User Dialog */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-primary shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-glow-accent flex items-center">
                <UserPlus className="mr-2 h-5 w-5 text-accent"/> Create New User
            </DialogTitle>
            <DialogDescription>Enter the details for the new user account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createUserForm.handleSubmit(handleCreateUserSubmit)} className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="create-fullName">Full Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <UserIconLucide className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="create-fullName" 
                  {...createUserForm.register("fullName")}
                  placeholder="e.g., Aisha Wanjiru"
                  className={`pl-9 bg-input border-primary focus:ring-accent ${createUserForm.formState.errors.fullName ? 'border-destructive' : ''}`} 
                  disabled={isCreateFormSubmitting}
                />
              </div>
              {createUserForm.formState.errors.fullName && <p className="text-xs text-destructive">{createUserForm.formState.errors.fullName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-email">Email Address <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="create-email" 
                  type="email"
                  {...createUserForm.register("email")}
                  placeholder="user@example.com"
                  className={`pl-9 bg-input border-primary focus:ring-accent ${createUserForm.formState.errors.email ? 'border-destructive' : ''}`} 
                  disabled={isCreateFormSubmitting}
                />
              </div>
              {createUserForm.formState.errors.email && <p className="text-xs text-destructive">{createUserForm.formState.errors.email.message}</p>}
            </div>
             <div className="space-y-1">
              <Label htmlFor="create-password">Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="create-password" 
                  type="password"
                  {...createUserForm.register("password")}
                  placeholder="Min. 8 characters"
                  className={`pl-9 bg-input border-primary focus:ring-accent ${createUserForm.formState.errors.password ? 'border-destructive' : ''}`} 
                  disabled={isCreateFormSubmitting}
                />
              </div>
              {createUserForm.formState.errors.password && <p className="text-xs text-destructive">{createUserForm.formState.errors.password.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                  <Label htmlFor="create-role">Role <span className="text-destructive">*</span></Label>
                  <Controller
                    name="role"
                    control={createUserForm.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isCreateFormSubmitting}>
                        <SelectTrigger id="create-role" className={`bg-input border-primary focus:ring-accent ${createUserForm.formState.errors.role ? 'border-destructive' : ''}`}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-primary">
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {createUserForm.formState.errors.role && <p className="text-xs text-destructive">{createUserForm.formState.errors.role.message}</p>}
              </div>
              <div className="space-y-1">
                  <Label htmlFor="create-status">Status <span className="text-destructive">*</span></Label>
                  <Controller
                    name="status"
                    control={createUserForm.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isCreateFormSubmitting}>
                        <SelectTrigger id="create-status" className={`bg-input border-primary focus:ring-accent ${createUserForm.formState.errors.status ? 'border-destructive' : ''}`}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-primary">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending_approval">Pending Approval</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {createUserForm.formState.errors.status && <p className="text-xs text-destructive">{createUserForm.formState.errors.status.message}</p>}
              </div>
            </div>
            <DialogFooter className="mt-2">
              <DialogClose asChild><Button type="button" variant="ghost" disabled={isCreateFormSubmitting}>Cancel</Button></DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isCreateFormSubmitting || !createUserForm.formState.isValid}>
                {isCreateFormSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlus className="mr-2 h-4 w-4"/>}
                {isCreateFormSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-glow-primary">User Management</CardTitle>
            <CardDescription className="text-muted-foreground">View, manage, and moderate platform users.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                <Filter className="mr-2 h-4 w-4" /> Filter Users
            </Button>
            <Button onClick={openCreateUserDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">
                <PlusCircle className="mr-2 h-5 w-5" /> Create New User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] hidden sm:table-cell"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid} className="hover:bg-muted/50">
                    <TableCell className="hidden sm:table-cell">
                       <Avatar className="h-10 w-10 border-2 border-primary/50">
                        <AvatarImage src={`https://placehold.co/40x40/E8A0BF/FFFFFF?text=${user.fullName ? user.fullName.substring(0,2).toUpperCase() : '??'}`} alt={user.fullName || user.email || 'User'} data-ai-hint="person icon" />
                        <AvatarFallback>{user.fullName ? user.fullName.substring(0,2).toUpperCase() : user.email ? user.email.substring(0,2).toUpperCase() : 'U'}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.fullName || 'N/A'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={getStatusBadgeVariant(user.status)}>
                        {user.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {actionLoading[user.uid] ? <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /> : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">User Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-primary shadow-lg">
                          <DropdownMenuItem onClick={() => openEditUserDialog(user)} className="hover:bg-primary/10 hover:text-primary cursor-pointer">
                            <Edit3 className="mr-2 h-4 w-4" /> Edit User Details
                          </DropdownMenuItem>
                          {user.status === 'pending_approval' && user.role === 'customer' && ( // Allow 'vendor' role promotion only if current role is 'customer'
                            <DropdownMenuItem onClick={() => handleUserAction(user.uid, 'approveVendor')} className="text-green-400 hover:bg-green-500/10 hover:!text-green-300 focus:bg-green-500/20 focus:!text-green-300 cursor-pointer">
                              <CheckCircle className="mr-2 h-4 w-4" /> Approve Vendor
                            </DropdownMenuItem>
                          )}
                          {user.status === 'active' && user.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => handleUserAction(user.uid, 'suspend')} className="text-yellow-400 hover:bg-yellow-500/10 hover:!text-yellow-300 focus:bg-yellow-500/20 focus:!text-yellow-300 cursor-pointer">
                              <ShieldAlert className="mr-2 h-4 w-4" /> Suspend User
                            </DropdownMenuItem>
                          )}
                          {user.status === 'suspended' && user.role !== 'admin' && (
                             <DropdownMenuItem onClick={() => handleUserAction(user.uid, 'activate')} className="text-green-400 hover:bg-green-500/10 hover:!text-green-300 focus:bg-green-500/20 focus:!text-green-300 cursor-pointer">
                              <CheckCircle className="mr-2 h-4 w-4" /> Activate User
                            </DropdownMenuItem>
                          )}
                           {user.role !== 'admin' && <DropdownMenuSeparator className="bg-border/50"/>}
                           {user.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => handleUserAction(user.uid, 'delete')} className="text-destructive hover:bg-destructive/10 hover:!text-destructive focus:bg-destructive/20 focus:!text-destructive cursor-pointer">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete User
                            </DropdownMenuItem>
                           )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <UserX className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No users found.</p>
              <p className="text-sm text-muted-foreground">The platform currently has no registered users or your filters returned no results.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
