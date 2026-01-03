import { supabase } from '../supabase/client';

export async function uploadProjectProjectPreview(projectId: string, file: File): Promise<string | null> {
    try {
        const fileName = `preview_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `${projectId}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('projects')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            if (error.message.includes('bucket not found')) {
                console.error('Supabase bucket "projects" not found. Please create it in the Supabase console and set it to PUBLIC.');
            }
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('projects')
            .getPublicUrl(filePath);

        if (!publicUrl) throw new Error('Could not generate public URL');

        return publicUrl;
    } catch (error) {
        console.error('Error uploading to Supabase:', error);
        return null;
    }
}

// Keeping the old name for backward compatibility if needed, but routing to Supabase
export const uploadProjectImage = uploadProjectProjectPreview;

export async function uploadTicketAttachment(projectId: string, file: File): Promise<string | null> {
    try {
        const fileName = `ticket_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `${projectId}/tickets/${fileName}`;

        const { data, error } = await supabase.storage
            .from('projects')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('projects')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading ticket attachment:', error);
        return null;
    }
}
