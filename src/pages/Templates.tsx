import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  MessageSquare, 
  Plus, 
  Copy, 
  Trash2, 
  Globe,
  Languages
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from 'sonner';

export default function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'Invitation',
    contentEN: '',
    contentAR: ''
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'templates'), (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const addTemplate = async () => {
    if (!newTemplate.name) return;
    try {
      await addDoc(collection(db, 'templates'), newTemplate);
      toast.success('Template saved');
      setIsAdding(false);
      setNewTemplate({ name: '', category: 'Invitation', contentEN: '', contentAR: '' });
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-condensed text-[24px] font-extrabold tracking-tight uppercase">Messaging Templates</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Manage bilingual (EN/AR) templates for invitations, reminders, and chases.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="bg-gc-orange text-white hover:bg-gc-orange/90 h-9 font-condensed font-bold tracking-wider">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {isAdding && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-condensed text-[18px] font-bold uppercase tracking-tight">Create Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase font-condensed text-muted-foreground">Template Name</Label>
                <Input 
                  value={newTemplate.name} 
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="e.g. Initial Invitation - Lifestyle"
                  className="bg-secondary/50 border-border h-10 text-[12.5px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase font-condensed text-muted-foreground">Category</Label>
                <Input 
                  value={newTemplate.category} 
                  onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                  placeholder="Invitation, Reminder, Chase"
                  className="bg-secondary/50 border-border h-10 text-[12.5px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase font-condensed text-muted-foreground">English Content</Label>
                <Textarea 
                  value={newTemplate.contentEN} 
                  onChange={(e) => setNewTemplate({...newTemplate, contentEN: e.target.value})}
                  rows={6}
                  className="bg-secondary/50 border-border font-sans text-[12.5px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase font-condensed text-muted-foreground">Arabic Content</Label>
                <Textarea 
                  value={newTemplate.contentAR} 
                  onChange={(e) => setNewTemplate({...newTemplate, contentAR: e.target.value})}
                  rows={6}
                  className="bg-secondary/50 border-border font-sans text-[12.5px] text-right"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAdding(false)} className="font-condensed font-bold uppercase tracking-wider h-9">Cancel</Button>
              <Button onClick={addTemplate} className="bg-gc-orange text-white hover:bg-gc-orange/90 font-condensed font-bold uppercase tracking-wider h-9">Save Template</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="bg-card border-border transition-all hover:border-gc-orange/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[9px] font-bold uppercase font-condensed border-border text-muted-foreground bg-secondary">
                  {template.category}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="text-[16px] font-bold font-condensed uppercase tracking-tight mt-2">{template.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="en" className="w-full">
                <TabsList className="bg-secondary border border-border w-full grid grid-cols-2 h-9">
                  <TabsTrigger value="en" className="text-[11px] font-bold uppercase font-condensed data-[state=active]:bg-card data-[state=active]:text-gc-orange">English</TabsTrigger>
                  <TabsTrigger value="ar" className="text-[11px] font-bold uppercase font-condensed data-[state=active]:bg-card data-[state=active]:text-gc-orange">Arabic</TabsTrigger>
                </TabsList>
                <TabsContent value="en" className="mt-4">
                  <div className="relative group">
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium">
                      {template.contentEN}
                    </div>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border"
                      onClick={() => copyToClipboard(template.contentEN)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="ar" className="mt-4">
                  <div className="relative group">
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap text-right font-medium" dir="rtl">
                      {template.contentAR}
                    </div>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border"
                      onClick={() => copyToClipboard(template.contentAR)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
