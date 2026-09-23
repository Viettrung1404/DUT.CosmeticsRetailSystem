export interface CategoryProps {
  id?: string;
  parentId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  children?: CategoryEntity[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class CategoryEntity {
  private _id?: string;
  private _parentId?: string | null;
  private _name: string;
  private _slug: string;
  private _description?: string | null;
  private _imageUrl?: string | null;
  private _sortOrder: number;
  private _isActive: boolean;
  private _metaTitle?: string | null;
  private _metaDescription?: string | null;
  private _children: CategoryEntity[];
  private _createdAt?: Date;
  private _updatedAt?: Date;

  constructor(props: CategoryProps) {
    this._id = props.id;
    this._parentId = props.parentId;
    this._name = props.name;
    this._slug = props.slug;
    this._description = props.description;
    this._imageUrl = props.imageUrl;
    this._sortOrder = props.sortOrder ?? 0;
    this._isActive = props.isActive ?? true;
    this._metaTitle = props.metaTitle;
    this._metaDescription = props.metaDescription;
    this._children = props.children ?? [];
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id(): string | undefined { return this._id; }
  get parentId(): string | null | undefined { return this._parentId; }
  get name(): string { return this._name; }
  get slug(): string { return this._slug; }
  get description(): string | null | undefined { return this._description; }
  get imageUrl(): string | null | undefined { return this._imageUrl; }
  get sortOrder(): number { return this._sortOrder; }
  get isActive(): boolean { return this._isActive; }
  get metaTitle(): string | null | undefined { return this._metaTitle; }
  get metaDescription(): string | null | undefined { return this._metaDescription; }
  get children(): CategoryEntity[] { return this._children; }
  get createdAt(): Date | undefined { return this._createdAt; }
  get updatedAt(): Date | undefined { return this._updatedAt; }

  set children(children: CategoryEntity[]) {
    this._children = children;
  }
}
