import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FolderPlus, Plus } from 'lucide-react';

interface AlbumConfigProps {
  selectedAlbumId: string;
  setSelectedAlbumId: (id: string) => void;
  albums: any[];
  newAlbumData: any;
  setNewAlbumData: (data: any) => void;
}

export const AlbumConfig: React.FC<AlbumConfigProps> = ({
  selectedAlbumId,
  setSelectedAlbumId,
  albums,
  newAlbumData,
  setNewAlbumData
}) => {
  return (
    <div className="mb-6 space-y-6 p-6 rounded-[2rem] bg-primary/5 border border-primary/10 animate-in zoom-in-95 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
          <FolderPlus className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">图集配置</h3>
          <p className="text-xs text-muted-foreground">选择现有图集或新建一个</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>选择图集</Label>
          <Select value={selectedAlbumId} onValueChange={setSelectedAlbumId}>
            <SelectTrigger className="rounded-xl bg-background border-border/50">
              <SelectValue placeholder="请选择目标图集" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              <SelectItem value="new" className="text-primary font-medium focus:bg-primary/10">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>新建图集</span>
                </div>
              </SelectItem>
              {albums.map((album: any) => (
                <SelectItem key={album.id} value={album.id}>{album.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedAlbumId === 'new' && (
          <div className="space-y-4 p-5 rounded-2xl bg-background/50 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">图集名称</Label>
                <Input 
                  placeholder="输入图集名称"
                  className="rounded-xl h-10 bg-background"
                  value={newAlbumData.title}
                  onChange={(e) => setNewAlbumData({...newAlbumData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">图集分类</Label>
                <Input 
                  placeholder="如：COS、写真"
                  className="rounded-xl h-10 bg-background"
                  value={newAlbumData.album_type}
                  onChange={(e) => setNewAlbumData({...newAlbumData, album_type: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">图集描述</Label>
              <Textarea 
                placeholder="简短描述图集内容"
                className="rounded-xl bg-background min-h-[80px]"
                value={newAlbumData.description}
                onChange={(e) => setNewAlbumData({...newAlbumData, description: e.target.value})}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-primary">生成 PDF 书籍</Label>
                <p className="text-[10px] text-muted-foreground">上传完成后自动生成 PDF 预览</p>
              </div>
              <Switch 
                checked={newAlbumData.auto_pdf_enabled}
                onCheckedChange={(checked) => setNewAlbumData({...newAlbumData, auto_pdf_enabled: checked})}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
