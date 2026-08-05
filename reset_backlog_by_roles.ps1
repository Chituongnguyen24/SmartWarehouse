$ErrorActionPreference = "Stop"

# =========================
# Config
# =========================
$OWNER = "Chituongnguyen24"
$REPO = "SmartWarehouse"
$REPO_FULL = "$OWNER/$REPO"
$PROJECT_TITLE = "SmartWarehouse Backlog"
$PROJECT_OWNER = $OWNER

# true = đóng issue cũ có prefix [EPIC] / [FEATURE]
$CLOSE_OLD = $true

function Ensure-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Thiếu command: $name"
  }
}

function Ensure-Label($name, $color, $desc) {
  try {
    gh label create $name --repo $REPO_FULL --color $color --description $desc 2>$null | Out-Null
    Write-Host "✅ label created: $name"
  } catch {
    gh label edit $name --repo $REPO_FULL --color $color --description $desc | Out-Null
    Write-Host "↪️ label updated: $name"
  }
}

function Issue-ExistsExact($title) {
  $json = gh issue list --repo $REPO_FULL --state all --limit 500 --json title | ConvertFrom-Json
  foreach ($i in $json) {
    if ($i.title -eq $title) { return $true }
  }
  return $false
}

function Create-IssueIfMissing($title, $body, $labelsCsv) {
  if (Issue-ExistsExact $title) {
    Write-Host "↪️ exists: $title"
  } else {
    gh issue create --repo $REPO_FULL --title $title --body $body --label $labelsCsv | Out-Null
    Write-Host "✅ created: $title"
  }
}

Ensure-Command gh
gh auth status | Out-Null

Write-Host "Repo: $REPO_FULL"

# =========================
# Labels
# =========================
Ensure-Label "type: epic" "5319E7" "Epic issue"
Ensure-Label "type: feature" "1D76DB" "Feature issue"

Ensure-Label "status: backlog" "BFDADC" "Backlog"
Ensure-Label "status: ready" "0E8A16" "Ready"
Ensure-Label "status: in-progress" "FBCA04" "In Progress"
Ensure-Label "status: review" "D4C5F9" "Review/QA"
Ensure-Label "status: done" "0E8A16" "Done"

Ensure-Label "priority: high" "B60205" "High priority"
Ensure-Label "priority: medium" "FBCA04" "Medium priority"
Ensure-Label "priority: low" "0E8A16" "Low priority"

Ensure-Label "role: admin" "0052CC" "Admin"
Ensure-Label "role: warehouse-manager" "006B75" "Quan ly kho"
Ensure-Label "role: warehouse-staff" "1D76DB" "Nhan vien kho"
Ensure-Label "role: sales-staff" "5319E7" "Nhan vien ban hang"
Ensure-Label "role: driver" "FBCA04" "Tai xe"
Ensure-Label "role: customer" "0E8A16" "Khach hang"

# =========================
# Close old issues (optional)
# =========================
if ($CLOSE_OLD) {
  Write-Host "Closing old [EPIC]/[FEATURE] issues..."
  $old = gh issue list --repo $REPO_FULL --state open --limit 500 --json number,title | ConvertFrom-Json
  foreach ($it in $old) {
    if ($it.title.StartsWith("[EPIC") -or $it.title.StartsWith("[FEATURE]")) {
      gh issue close $it.number --repo $REPO_FULL --comment "Closed to migrate backlog to role-based structure." | Out-Null
      Write-Host "  closed #$($it.number)"
    }
  }
}

# =========================
# Data
# =========================
$EPICS = @(
  @{ ID="R1"; Title="Admin"; Role="role: admin"; Priority="high" },
  @{ ID="R2"; Title="Quản lý kho"; Role="role: warehouse-manager"; Priority="high" },
  @{ ID="R3"; Title="Nhân viên kho"; Role="role: warehouse-staff"; Priority="high" },
  @{ ID="R4"; Title="Nhân viên bán hàng"; Role="role: sales-staff"; Priority="high" },
  @{ ID="R5"; Title="Tài xế"; Role="role: driver"; Priority="medium" },
  @{ ID="R6"; Title="Khách hàng"; Role="role: customer"; Priority="high" }
)

$FEATURES = @{
  "R1" = @(
    "Quản lý hệ thống|Dashboard",
    "Quản lý hệ thống|Quản lý người dùng (CRUD)",
    "Quản lý hệ thống|Quản lý Role & Permission",
    "Quản lý hệ thống|Khóa/Mở khóa tài khoản",
    "Quản lý hệ thống|Reset mật khẩu",
    "Quản lý dữ liệu|Quản lý kho",
    "Quản lý dữ liệu|Quản lý danh mục",
    "Quản lý dữ liệu|Quản lý sản phẩm",
    "Quản lý dữ liệu|Quản lý nhà cung cấp",
    "Báo cáo|Báo cáo doanh thu",
    "Báo cáo|Báo cáo tồn kho",
    "Báo cáo|Báo cáo nhập/xuất",
    "Báo cáo|Nhật ký hoạt động (Audit Log)"
  )
  "R2" = @(
    "Quản lý sản phẩm|CRUD sản phẩm",
    "Quản lý sản phẩm|Quản lý SKU/Barcode",
    "Quản lý sản phẩm|Upload ảnh sản phẩm",
    "Quản lý kho|Quản lý vị trí lưu trữ",
    "Quản lý kho|Điều chuyển sản phẩm trong kho",
    "Quản lý kho|Quản lý sức chứa",
    "Quản lý nhập hàng|Duyệt phiếu nhập",
    "Quản lý nhập hàng|Duyệt phiếu xuất",
    "Kiểm kê|Kiểm kê",
    "Kiểm kê|Điều chỉnh tồn kho",
    "Báo cáo|Thống kê tồn kho",
    "Báo cáo|Hàng sắp hết",
    "Báo cáo|Hàng tồn lâu"
  )
  "R3" = @(
    "Nhập kho|Tạo phiếu nhập",
    "Nhập kho|Xác nhận nhập hàng",
    "Nhập kho|Cập nhật số lượng",
    "Xuất kho|Tạo phiếu xuất",
    "Xuất kho|Chuẩn bị hàng",
    "Xuất kho|Đóng gói",
    "Xuất kho|Xác nhận xuất kho",
    "Kiểm kê|Kiểm kê hàng hóa",
    "Kiểm kê|Báo cáo hàng lỗi",
    "Kiểm kê|Báo cáo thất thoát",
    "Tra cứu|Xem tồn kho",
    "Tra cứu|Tìm kiếm sản phẩm"
  )
  "R4" = @(
    "Khách hàng|CRUD khách hàng",
    "Khách hàng|Tra cứu khách hàng",
    "Đơn hàng|Tạo đơn hàng",
    "Đơn hàng|Chỉnh sửa đơn",
    "Đơn hàng|Hủy đơn",
    "Đơn hàng|Theo dõi trạng thái đơn",
    "Thanh toán|Ghi nhận thanh toán",
    "Thanh toán|In hóa đơn",
    "Theo dõi|Lịch sử mua hàng",
    "Theo dõi|Theo dõi giao hàng"
  )
  "R5" = @(
    "Giao hàng|Xem danh sách đơn cần giao",
    "Giao hàng|Nhận đơn giao",
    "Giao hàng|Xem lộ trình",
    "Giao hàng|Cập nhật vị trí (nếu có)",
    "Trạng thái|Đã nhận hàng",
    "Trạng thái|Đang giao",
    "Trạng thái|Giao thành công",
    "Trạng thái|Giao thất bại",
    "Xác nhận|Chụp ảnh giao hàng",
    "Xác nhận|Thu tiền COD",
    "Xác nhận|Ghi chú lý do giao thất bại"
  )
  "R6" = @(
    "Tài khoản|Đăng ký",
    "Tài khoản|Đăng nhập",
    "Tài khoản|Quên mật khẩu",
    "Tài khoản|Cập nhật hồ sơ",
    "Mua hàng|Xem sản phẩm",
    "Mua hàng|Tìm kiếm",
    "Mua hàng|Lọc sản phẩm",
    "Mua hàng|Xem chi tiết",
    "Giỏ hàng|Thêm vào giỏ",
    "Giỏ hàng|Cập nhật số lượng",
    "Giỏ hàng|Xóa sản phẩm",
    "Đặt hàng|Đặt hàng",
    "Đặt hàng|Thanh toán",
    "Đặt hàng|Theo dõi đơn hàng",
    "Đặt hàng|Hủy đơn (nếu chưa xử lý)",
    "Khác|Xem lịch sử mua hàng",
    "Khác|Đánh giá sản phẩm",
    "Khác|Nhận thông báo"
  )
}

# =========================
# Create epic + feature issues
# =========================
foreach ($epic in $EPICS) {
  $epicTitle = "[EPIC $($epic.ID)] $($epic.Title)"
  $epicBody = @"
## Vai trò
$($epic.Title)

## Mục tiêu
Hoàn thiện toàn bộ chức năng cho vai trò **$($epic.Title)**.

## Scope
Các issue con có prefix: **[FEATURE][$($epic.ID)]**.

## Definition of Done
- Hoàn thành chức năng + test
- Đạt acceptance criteria
- Cập nhật tài liệu (nếu có)
"@

  $epicLabels = "type: epic,status: backlog,priority: $($epic.Priority),$($epic.Role)"
  Create-IssueIfMissing $epicTitle $epicBody $epicLabels

  foreach ($entry in $FEATURES[$epic.ID]) {
    $parts = $entry -split "\|",2
    $group = $parts[0]
    $feat = $parts[1]

    $title = "[FEATURE][$($epic.ID)][$group] $feat"
    $body = @"
## Vai trò
$($epic.Title)

## Nhóm chức năng
$group

## User Story
Là **$($epic.Title)**, tôi cần **$feat** để thực hiện công việc.

## Acceptance Criteria
- [ ] Có UI/API cho chức năng **$feat**
- [ ] Validate dữ liệu
- [ ] Có test case chính
- [ ] Log/Audit phù hợp (nếu cần)

## Liên kết Epic
$epicTitle
"@
    $labels = "type: feature,status: backlog,priority: medium,$($epic.Role)"
    Create-IssueIfMissing $title $body $labels
  }
}

# =========================
# Create/find ProjectV2
# =========================
$plist = gh project list --owner $PROJECT_OWNER --format json | ConvertFrom-Json
$proj = $plist.projects | Where-Object { $_.title -eq $PROJECT_TITLE } | Select-Object -First 1

if (-not $proj) {
  $created = gh project create --owner $PROJECT_OWNER --title $PROJECT_TITLE --format json | ConvertFrom-Json
  $PROJECT_ID = $created.id
  Write-Host "✅ created project: $PROJECT_TITLE"
} else {
  $PROJECT_ID = $proj.id
  Write-Host "↪️ project exists: $PROJECT_TITLE"
}

# =========================
# Add issues into project
# =========================
$openIssues = gh issue list --repo $REPO_FULL --state open --limit 500 --json number,title | ConvertFrom-Json
foreach ($it in $openIssues) {
  if ($it.title.StartsWith("[EPIC R") -or $it.title.StartsWith("[FEATURE][R")) {
    $url = "https://github.com/$REPO_FULL/issues/$($it.number)"
    try {
      gh project item-add $PROJECT_ID --owner $PROJECT_OWNER --url $url | Out-Null
    } catch {
      # ignore if already added
    }
  }
}

Write-Host ""
Write-Host "🎉 DONE"
Write-Host "Issues:  https://github.com/$REPO_FULL/issues"
Write-Host "Project: https://github.com/users/$PROJECT_OWNER/projects"