import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, Project, User } from './db/types';

const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = error => reject(error);
        img.src = url;
    });
};

export const generateInvoicePDF = async (invoice: Invoice, project: Project | null, client: User | null) => {
    const doc = new jsPDF();

    // Add Logo
    try {
        const logoData = await getBase64ImageFromURL('/logo.PNG');
        doc.addImage(logoData, 'PNG', 15, 10, 25, 25);
    } catch (error) {
        console.warn('Could not load logo for PDF:', error);
    }

    // Header Info
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text('INVOICE', 140, 25);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 140, 35);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 140, 40);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 140, 45);

    // Business Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('BridgeBreak', 15, 45);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Your Professional Solution Partner', 15, 50);

    // Client Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Bill To:', 15, 70);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(client?.full_name || 'Client', 15, 75);
    doc.text(client?.email || '', 15, 80);

    // Project Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Project:', 140, 70);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(project?.title || 'General Service', 140, 75);

    // Table
    const tableData = [
        [
            project?.title || 'Service',
            invoice.description || project?.description?.substring(0, 80) + '...' || 'Professional services',
            1,
            `$${invoice.amount.toFixed(2)}`,
            `$${invoice.amount.toFixed(2)}`
        ]
    ];

    autoTable(doc, {
        startY: 95,
        head: [['Item', 'Description', 'Quantity', 'Price', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [51, 51, 51], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Totals
    let finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Amount: $${invoice.amount.toFixed(2)}`, 140, finalY + 10);
    finalY += 20;

    // Notes Section
    if (invoice.notes) {
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text('Notes:', 15, finalY);
        doc.setFontSize(10);
        doc.setTextColor(100);
        const splitNotes = doc.splitTextToSize(invoice.notes, 180);
        doc.text(splitNotes, 15, finalY + 7);
    }

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Thank you for your business!', 105, 285, { align: 'center' });

    // Save
    doc.save(`${invoice.invoice_number}.pdf`);
};
