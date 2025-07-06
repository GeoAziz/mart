export interface Review {
    id: string;
    productId: string;
    productName: string;
    vendorId: string;
    userId: string;
    customerName: string;
    customerAvatar?: string;
    customerInitials?: string;
    rating: number;
    comment: string;
    createdAt: Date;
    reply?: string;
    repliedAt?: Date;
}
