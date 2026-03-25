export interface BranchTreeNode<T> {
  name: string;
  path: string;
  isLeaf: boolean;
  data?: T;
  children: Record<string, BranchTreeNode<T>>;
}

export function buildBranchTree<T>(
  items: T[],
  getName: (item: T) => string
): BranchTreeNode<T> {
  const root: BranchTreeNode<T> = {
    name: "root",
    path: "",
    isLeaf: false,
    children: {},
  };

  for (const item of items) {
    const fullPath = getName(item);
    const parts = fullPath.split("/");

    let current = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLeaf = i === parts.length - 1;

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: currentPath,
          isLeaf: false,
          children: {},
        };
      }

      current = current.children[part];

      if (isLeaf) {
        current.isLeaf = true;
        current.data = item;
      }
    }
  }

  return root;
}

export function sortTreeNodes<T>(node: BranchTreeNode<T>): BranchTreeNode<T>[] {
  const children = Object.values(node.children);
  children.sort((a, b) => {
    // Leaves first, then directories
    const aIsFolder = Object.keys(a.children).length > 0;
    const bIsFolder = Object.keys(b.children).length > 0;

    if (aIsFolder && !bIsFolder) return 1;
    if (!aIsFolder && bIsFolder) return -1;

    // Alphabetical within same type
    return a.name.localeCompare(b.name);
  });
  return children;
}
