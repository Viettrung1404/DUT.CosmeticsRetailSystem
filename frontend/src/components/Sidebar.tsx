export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-100 p-4 h-full border-r">
      <h2 className="font-semibold mb-4">Danh mục</h2>
      <ul>
        <li className="mb-2"><a href="#">Chăm sóc da</a></li>
        <li className="mb-2"><a href="#">Trang điểm</a></li>
        <li className="mb-2"><a href="#">Nước hoa</a></li>
      </ul>
    </aside>
  );
}