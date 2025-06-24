
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit3, Trash2, Tag, ListTree, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import type { Category } from '@/lib/types';


export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data: Category[] = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : "Could not load categories.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Error', description: 'Category name cannot be empty.', variant: 'destructive' });
      return;
    }
    if (!currentUser) {
        toast({title: "Not Authenticated", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: newCategoryName, description: newCategoryDescription }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add category');
        }
        toast({ title: 'Category Added', description: `"${newCategoryName}" has been added.` });
        setNewCategoryName('');
        setNewCategoryDescription('');
        setShowAddDialog(false);
        fetchCategories(); // Refresh list
    } catch (error) {
        toast({ title: 'Error', description: error instanceof Error ? error.message : "Could not add category.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast({ title: 'Error', description: 'Category name cannot be empty.', variant: 'destructive' });
      return;
    }
     if (!currentUser) {
        toast({title: "Not Authenticated", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
     try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/categories/${editingCategory.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: editingCategory.name, description: editingCategory.description }),
        });
         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update category');
        }
        toast({ title: 'Category Updated', description: `"${editingCategory.name}" has been updated.` });
        setEditingCategory(null);
        fetchCategories();
    } catch (error) {
        toast({ title: 'Error', description: error instanceof Error ? error.message : "Could not update category.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete || !currentUser) return;
    setIsSubmitting(true);
    try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete category');
        }
        toast({ title: 'Category Deleted', description: `"${categoryToDelete.name}" has been removed.`, variant: 'destructive' });
        setCategoryToDelete(null);
        fetchCategories();
    } catch (error) {
        toast({ title: 'Error', description: error instanceof Error ? error.message : "Could not delete category.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const openEditDialog = (category: Category) => {
    setEditingCategory({ ...category });
  };
  
  const openDeleteDialog = (category: Category) => {
    setCategoryToDelete(category);
  };


  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
              <ListTree className="mr-3 h-6 w-6 text-primary" /> Category Management
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Organize products by adding, editing, or removing categories.
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground glow-edge-primary">
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-primary shadow-xl">
              <DialogHeader>
                <DialogTitle className="text-glow-accent">Add New Category</DialogTitle>
                <DialogDescription>
                  Enter the name and an optional description for the new category.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-cat-name" className="text-right">Name</Label>
                  <Input id="new-cat-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="col-span-3 bg-input border-primary focus:ring-accent" placeholder="Category Name" disabled={isSubmitting}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-cat-desc" className="text-right">Description</Label>
                  <Input id="new-cat-desc" value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} className="col-span-3 bg-input border-primary focus:ring-accent" placeholder="Optional description" disabled={isSubmitting}/>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost" disabled={isSubmitting}>Cancel</Button></DialogClose>
                <Button type="submit" onClick={handleAddCategory} className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Add Category'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
          ) : categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{category.description || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-2">
                       <Dialog open={!!editingCategory && editingCategory.id === category.id} onOpenChange={(isOpen) => !isOpen && setEditingCategory(null)}>
                        <DialogTrigger asChild>
                           <Button variant="outline" size="sm" onClick={() => openEditDialog(category)} className="text-accent border-accent hover:bg-accent hover:text-accent-foreground" disabled={isSubmitting}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                         {editingCategory && editingCategory.id === category.id && (
                          <DialogContent className="sm:max-w-[425px] bg-card border-primary shadow-xl">
                            <DialogHeader>
                              <DialogTitle className="text-glow-accent">Edit Category: {editingCategory.name}</DialogTitle>
                              <DialogDescription>
                                Update the category details below.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-cat-name" className="text-right">Name</Label>
                                <Input id="edit-cat-name" value={editingCategory.name} onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})} className="col-span-3 bg-input border-primary focus:ring-accent" disabled={isSubmitting}/>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-cat-desc" className="text-right">Description</Label>
                                <Input id="edit-cat-desc" value={editingCategory.description || ''} onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})} className="col-span-3 bg-input border-primary focus:ring-accent" disabled={isSubmitting}/>
                              </div>
                            </div>
                            <DialogFooter>
                               <Button variant="ghost" onClick={() => setEditingCategory(null)} disabled={isSubmitting}>Cancel</Button>
                              <Button type="submit" onClick={handleEditCategory} className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Save Changes'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                         )}
                      </Dialog>

                      <AlertDialog open={!!categoryToDelete && categoryToDelete.id === category.id} onOpenChange={(isOpen) => !isOpen && setCategoryToDelete(null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => openDeleteDialog(category)} className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        {categoryToDelete && categoryToDelete.id === category.id && (
                        <AlertDialogContent className="bg-card border-destructive shadow-xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-glow-primary">Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the category
                              <strong className="text-destructive-foreground"> "{categoryToDelete.name}"</strong>.
                              Products in this category will need to be reassigned.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel asChild><Button variant="ghost" onClick={() => setCategoryToDelete(null)} disabled={isSubmitting}>Cancel</Button></AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Yes, delete category'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                        )}
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Tag className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">No categories found.</p>
              <p className="text-sm text-muted-foreground">Start by adding product categories for your marketplace.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
