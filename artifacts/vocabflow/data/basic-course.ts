export interface BasicCourseWord {
  id: string;
  term: string;
  meaning: string;
}

export interface BasicCourseLesson {
  id: string;
  title: string;
  words: BasicCourseWord[];
}

interface RawLesson {
  id: string;
  title: string;
  entries: string;
}

const rawLessons: RawLesson[] = [
  {
    id: 'greetings',
    title: 'Chào hỏi và giao tiếp lịch sự',
    entries: `
hello|xin chào
hi|chào
goodbye|tạm biệt
bye|chào nhé
good morning|chào buổi sáng
good afternoon|chào buổi chiều
good evening|chào buổi tối
good night|chúc ngủ ngon
welcome|chào mừng
please|làm ơn
thank you|cảm ơn
thanks|cảm ơn
you're welcome|không có gì
sorry|xin lỗi
excuse me|xin phép
pardon|xin nhắc lại
yes|vâng
no|không
okay|được
sure|chắc chắn
name|tên
first name|tên
last name|họ
friend|bạn
guest|khách
neighbor|hàng xóm
nice|dễ mến
meet|gặp
congratulations|xin chúc mừng
cheers|chúc mừng
take care|bảo trọng
how|như thế nào
what|cái gì
where|ở đâu
who|ai
`,
  },
  {
    id: 'family',
    title: 'Gia đình và con người',
    entries: `
family|gia đình
parent|cha hoặc mẹ
mother|mẹ
father|cha
mom|mẹ
dad|ba
child|đứa trẻ
kid|trẻ em
son|con trai
daughter|con gái
brother|anh hoặc em trai
sister|chị hoặc em gái
sibling|anh chị em ruột
husband|chồng
wife|vợ
grandparent|ông hoặc bà
grandmother|bà
grandfather|ông
grandma|bà
grandpa|ông
uncle|chú, bác hoặc cậu
aunt|cô, dì hoặc bác gái
cousin|anh chị em họ
nephew|cháu trai
niece|cháu gái
relative|họ hàng
baby|em bé
adult|người lớn
teenager|thiếu niên
people|mọi người
person|một người
man|đàn ông
woman|phụ nữ
boy|bé trai
girl|bé gái
marry|kết hôn
wedding|đám cưới
generation|thế hệ
`,
  },
  {
    id: 'home',
    title: 'Nhà cửa và đồ đạc',
    entries: `
home|nhà
house|ngôi nhà
apartment|căn hộ
room|phòng
bedroom|phòng ngủ
bathroom|phòng tắm
kitchen|nhà bếp
living room|phòng khách
dining room|phòng ăn
door|cửa
window|cửa sổ
wall|bức tường
floor|sàn nhà
ceiling|trần nhà
roof|mái nhà
stairs|cầu thang
hallway|hành lang
key|chìa khóa
lock|ổ khóa
table|cái bàn
chair|cái ghế
sofa|ghế sô pha
bed|giường
pillow|gối
blanket|chăn
sheet|ga trải giường
mattress|nệm
desk|bàn làm việc
shelf|kệ
drawer|ngăn kéo
lamp|đèn bàn
garage|nhà để xe
mirror|gương
closet|tủ âm tường
wardrobe|tủ quần áo
curtain|rèm cửa
carpet|thảm trải sàn
rug|tấm thảm nhỏ
fan|quạt
heater|máy sưởi
air conditioner|máy điều hòa
refrigerator|tủ lạnh
`,
  },
  {
    id: 'numbers',
    title: 'Số đếm và số lượng',
    entries: `
number|con số
zero|số không
one|một
two|hai
three|ba
four|bốn
five|năm
six|sáu
seven|bảy
eight|tám
nine|chín
ten|mười
eleven|mười một
twelve|mười hai
thirteen|mười ba
fourteen|mười bốn
fifteen|mười lăm
sixteen|mười sáu
seventeen|mười bảy
eighteen|mười tám
nineteen|mười chín
twenty|hai mươi
thirty|ba mươi
forty|bốn mươi
fifty|năm mươi
hundred|một trăm
thousand|một nghìn
last|cuối cùng
half|một nửa
quarter|một phần tư
many|nhiều
few|ít
more|nhiều hơn
less|ít hơn
several|vài
`,
  },
  {
    id: 'time',
    title: 'Thời gian và lịch',
    entries: `
time|thời gian
day|ngày
week|tuần
weekend|cuối tuần
weekday|ngày trong tuần
month|tháng
year|năm
morning|buổi sáng
afternoon|buổi chiều
evening|buổi tối
night|ban đêm
midnight|nửa đêm
today|hôm nay
yesterday|hôm qua
tomorrow|ngày mai
now|bây giờ
later|sau đó
early|sớm
late|muộn
always|luôn luôn
usually|thường xuyên
often|thường
sometimes|đôi khi
rarely|hiếm khi
never|không bao giờ
minute|phút
hour|giờ
second|giây
date|ngày tháng
calendar|lịch
Monday|thứ Hai
Tuesday|thứ Ba
Wednesday|thứ Tư
Thursday|thứ Năm
Friday|thứ Sáu
Saturday|thứ Bảy
Sunday|Chủ nhật
spring|mùa xuân
summer|mùa hè
autumn|mùa thu
winter|mùa đông
soon|sớm thôi
`,
  },
  {
    id: 'food',
    title: 'Đồ ăn và thức uống',
    entries: `
food|thức ăn
meal|bữa ăn
breakfast|bữa sáng
lunch|bữa trưa
dinner|bữa tối
snack|đồ ăn nhẹ
menu|thực đơn
dish|món ăn
bread|bánh mì
rice|cơm
noodle|mì
pasta|mì Ý
soup|súp
salad|rau trộn
meat|thịt
beef|thịt bò
pork|thịt heo
chicken|thịt gà
fish|cá
egg|trứng
milk|sữa
cheese|phô mai
butter|bơ
yogurt|sữa chua
fruit|trái cây
apple|quả táo
banana|quả chuối
orange|quả cam
grape|quả nho
lemon|quả chanh vàng
vegetable|rau củ
potato|khoai tây
tomato|cà chua
onion|hành tây
carrot|cà rốt
bean|đậu
corn|bắp
mushroom|nấm
salt|muối
sugar|đường
pepper|tiêu
oil|dầu ăn
water|nước
tea|trà
coffee|cà phê
`,
  },
  {
    id: 'cooking',
    title: 'Nấu ăn và dụng cụ bếp',
    entries: `
bake|nướng bánh
fry|chiên
boil|luộc
grill|nướng vỉ
roast|quay
steam|hấp
chop|băm
slice|thái lát
mix|trộn
stir|khuấy
pour|rót
add|thêm
taste|nếm
smell|ngửi
recipe|công thức nấu ăn
ingredient|nguyên liệu
pan|chảo
pot|nồi
oven|lò nướng
stove|bếp nấu
knife|dao
fork|nĩa
spoon|thìa
plate|đĩa
bowl|tô
cup|tách
bottle|chai
freezer|ngăn đá
kettle|ấm đun nước
toaster|máy nướng bánh mì
blender|máy xay
cutting board|thớt
apron|tạp dề
kitchen towel|khăn bếp
peel|gọt vỏ
serve|dọn món
tablecloth|khăn trải bàn
heat|đun nóng
`,
  },
  {
    id: 'clothes',
    title: 'Quần áo và màu sắc',
    entries: `
clothes|quần áo
shirt|áo sơ mi
T-shirt|áo thun
blouse|áo kiểu
sweater|áo len
jacket|áo khoác ngắn
coat|áo khoác dài
dress|váy liền
skirt|chân váy
pants|quần dài
jeans|quần bò
shorts|quần đùi
socks|tất
shoes|giày
boots|ủng
sandals|dép quai hậu
hat|mũ
cap|mũ lưỡi trai
scarf|khăn quàng cổ
gloves|găng tay
belt|thắt lưng
tie|cà vạt
suit|bộ com lê
uniform|đồng phục
pocket|túi áo
button|cúc áo
zipper|khóa kéo
size|kích cỡ
fit|vừa vặn
wear|mặc
put on|mặc vào
take off|cởi ra
red|màu đỏ
blue|màu xanh dương
green|màu xanh lá
yellow|màu vàng
black|màu đen
white|màu trắng
gray|màu xám
brown|màu nâu
`,
  },
  {
    id: 'health',
    title: 'Cơ thể và sức khỏe',
    entries: `
body|cơ thể
head|đầu
face|khuôn mặt
hair|tóc
eye|mắt
ear|tai
nose|mũi
mouth|miệng
tooth|răng
neck|cổ
shoulder|vai
arm|cánh tay
elbow|khuỷu tay
hand|bàn tay
finger|ngón tay
thumb|ngón cái
chest|ngực
back|lưng
stomach|bụng
waist|eo
leg|chân
knee|đầu gối
foot|bàn chân
toe|ngón chân
skin|da
heart|tim
blood|máu
brain|não
health|sức khỏe
disease|bệnh
pain|cơn đau
headache|đau đầu
fever|sốt
cough|ho
flu|cúm
infection|nhiễm trùng
medicine|thuốc
doctor|bác sĩ
nurse|y tá
hospital|bệnh viện
clinic|phòng khám
healthy|khỏe mạnh
`,
  },
  {
    id: 'school',
    title: 'Trường học và học tập',
    entries: `
school|trường học
classroom|phòng học
class|lớp học
lesson|bài học
teacher|giáo viên
student|học sinh
schoolbag|cặp sách
backpack|ba lô
book|sách
notebook|vở
page|trang
paper|giấy
pencil|bút chì
pen|bút mực
eraser|cục tẩy
ruler|thước kẻ
board|bảng
marker|bút lông
college|trường cao đẳng
exam|kỳ thi
test|bài kiểm tra
homework|bài tập về nhà
assignment|bài tập được giao
subject|môn học
English|tiếng Anh
math|toán
science|khoa học
history|lịch sử
geography|địa lý
art|mỹ thuật
music|âm nhạc
learn|học
study|nghiên cứu
read|đọc
write|viết
spell|đánh vần
answer|câu trả lời
question|câu hỏi
grade|điểm số
principal|hiệu trưởng
`,
  },
  {
    id: 'work',
    title: 'Công việc và nghề nghiệp',
    entries: `
work|công việc
job|nghề nghiệp
office|văn phòng
company|công ty
business|việc kinh doanh
boss|sếp
manager|quản lý
employee|nhân viên
colleague|đồng nghiệp
team|đội nhóm
meeting|cuộc họp
project|dự án
task|nhiệm vụ
report|báo cáo
plan|kế hoạch
schedule|lịch làm việc
career|sự nghiệp
salary|lương tháng
wage|tiền công
customer|khách hàng
client|thân chủ
service|dịch vụ
factory|nhà máy
farmer|nông dân
artist|nghệ sĩ
engineer|kỹ sư
lawyer|luật sư
chef|đầu bếp
police officer|cảnh sát
firefighter|lính cứu hỏa
pilot|phi công
receptionist|nhân viên lễ tân
secretary|thư ký
mechanic|thợ máy
designer|nhà thiết kế
accountant|kế toán
assistant|trợ lý
interview|buổi phỏng vấn
application|đơn ứng tuyển
resume|sơ yếu lý lịch
hire|thuê
resign|xin nghỉ việc
`,
  },
  {
    id: 'travel',
    title: 'Giao thông và du lịch',
    entries: `
travel|du lịch
trip|chuyến đi
journey|hành trình
vacation|kỳ nghỉ
holiday|ngày nghỉ
tourist|khách du lịch
visitor|khách tham quan
passport|hộ chiếu
visa|thị thực
ticket|vé
luggage|hành lý
suitcase|va li
airport|sân bay
airplane|máy bay
flight|chuyến bay
gate|cổng lên máy bay
station|nhà ga
train|tàu hỏa
subway|tàu điện ngầm
bus|xe buýt
taxi|xe tắc xi
car|ô tô
truck|xe tải
bicycle|xe đạp
motorcycle|xe máy
boat|thuyền
ship|tàu thủy
ferry|phà
traffic|giao thông
road|con đường
street|phố
highway|đường cao tốc
bridge|cây cầu
map|bản đồ
hotel|khách sạn
hostel|nhà nghỉ
reservation|đặt chỗ
arrive|đến nơi
depart|khởi hành
leave|rời đi
explore|khám phá
visit|thăm
rent|thuê
route|tuyến đường
excursion|chuyến tham quan
`,
  },
  {
    id: 'places',
    title: 'Thành phố và địa điểm',
    entries: `
city|thành phố
town|thị trấn
village|ngôi làng
country|đất nước
capital|thủ đô
neighborhood|khu phố
address|địa chỉ
park|công viên
garden|khu vườn
square|quảng trường
market|chợ
supermarket|siêu thị
bank|ngân hàng
post office|bưu điện
library|thư viện
museum|bảo tàng
cinema|rạp chiếu phim
theater|nhà hát
stadium|sân vận động
cafe|quán cà phê
pharmacy|hiệu thuốc
police station|đồn cảnh sát
fire station|trạm cứu hỏa
church|nhà thờ
temple|đền
mosque|nhà thờ Hồi giáo
beach|bãi biển
mountain|núi
river|sông
lake|hồ
forest|rừng
zoo|sở thú
playground|sân chơi
building|tòa nhà
entrance|lối vào
exit|lối ra
corner|góc đường
crossroads|ngã tư
sidewalk|vỉa hè
parking lot|bãi đỗ xe
downtown|trung tâm thành phố
suburb|vùng ngoại ô
`,
  },
  {
    id: 'shopping',
    title: 'Mua sắm và tiền bạc',
    entries: `
shopping|việc mua sắm
price|giá
cost|chi phí
cash|tiền mặt
coin|đồng xu
bill|hóa đơn
banknote|tiền giấy
credit card|thẻ tín dụng
debit card|thẻ ghi nợ
small change|tiền lẻ
receipt|biên lai
discount|giảm giá
sale|đợt bán hạ giá
bargain|món hời
expensive|đắt
cheap|rẻ
wallet|ví nam
purse|ví nhỏ
cashier|thu ngân
checkout|quầy thanh toán
brand|thương hiệu
product|sản phẩm
item|món hàng
basket|giỏ
cart|xe đẩy hàng
fitting room|phòng thử đồ
return|trả hàng
exchange|đổi hàng
pay|trả tiền
spend|tiêu tiền
save|tiết kiệm
budget|ngân sách
tax|thuế
afford|có đủ tiền mua
borrow|mượn
lend|cho mượn
refund|hoàn tiền
online order|đơn đặt hàng trực tuyến
delivery|giao hàng
queue|hàng chờ
`,
  },
  {
    id: 'weather',
    title: 'Thời tiết và thiên nhiên',
    entries: `
weather|thời tiết
forecast|dự báo
sun|mặt trời
moon|mặt trăng
star|ngôi sao
sky|bầu trời
cloud|đám mây
cloudy|nhiều mây
rain|mưa
rainy|có mưa
storm|bão
thunder|sấm
lightning|tia chớp
wind|gió
windy|có gió
snow|tuyết
snowy|có tuyết
fog|sương mù
foggy|có sương mù
ice|băng
cold|lạnh
hot|nóng
warm|ấm
cool|mát
temperature|nhiệt độ
climate|khí hậu
nature|thiên nhiên
air|không khí
earth|trái đất
soil|đất trồng
grass|cỏ
tree|cây
flower|hoa
leaf|lá
branch|cành cây
hill|đồi
valley|thung lũng
ocean|đại dương
island|hòn đảo
desert|sa mạc
`,
  },
  {
    id: 'animals',
    title: 'Động vật và thú cưng',
    entries: `
animal|động vật
pet|thú cưng
dog|chó
puppy|chó con
cat|mèo
kitten|mèo con
bird|chim
duck|vịt
hen|gà mái
rooster|gà trống
rabbit|thỏ
mouse|chuột nhắt
rat|chuột cống
horse|ngựa
cow|bò
pig|heo
sheep|cừu
goat|dê
deer|hươu
bear|gấu
lion|sư tử
tiger|hổ
elephant|voi
monkey|khỉ
snake|rắn
frog|ếch
turtle|rùa
insect|côn trùng
bee|ong
butterfly|bướm
ant|kiến
spider|nhện
worm|giun
tail|đuôi
wing|cánh
fur|lông thú
feather|lông vũ
paw|bàn chân thú
`,
  },
  {
    id: 'daily-routine',
    title: 'Thói quen hằng ngày',
    entries: `
routine|thói quen
alarm|chuông báo
alarm clock|đồng hồ báo thức
shower|vòi sen
bath|bồn tắm
toothbrush|bàn chải đánh răng
toothpaste|kem đánh răng
soap|xà phòng
shampoo|dầu gội
towel|khăn tắm
comb|lược
hairbrush|bàn chải tóc
washing machine|máy giặt
dryer|máy sấy
dishwasher|máy rửa bát
vacuum|máy hút bụi
broom|chổi
mop|cây lau nhà
dustpan|đồ hốt rác
trash|rác
garbage|rác thải
recycling|việc tái chế
laundry|quần áo cần giặt
chore|việc nhà
sleep|ngủ
nap|ngủ trưa
rest|nghỉ ngơi
relax|thư giãn
exercise|tập thể dục
jog|chạy bộ chậm
stretch|giãn cơ
meditate|thiền
get up|thức dậy
wake up|đánh thức
go to bed|đi ngủ
fall asleep|thiếp đi
dress|mặc quần áo
undress|cởi quần áo
shave|cạo râu
fold|gấp
iron|ủi quần áo
tidy|dọn gọn
rush|vội vã
hurry|nhanh lên
commute|đi làm hằng ngày
`,
  },
  {
    id: 'technology',
    title: 'Giao tiếp và công nghệ',
    entries: `
conversation|cuộc trò chuyện
talk|cuộc nói chuyện
chat|trò chuyện
language|ngôn ngữ
message|tin nhắn
text|tin nhắn văn bản
phone|điện thoại
smartphone|điện thoại thông minh
computer|máy tính
laptop|máy tính xách tay
tablet|máy tính bảng
screen|màn hình
keyboard|bàn phím
internet|mạng internet
website|trang web
app|ứng dụng
account|tài khoản
password|mật khẩu
username|tên người dùng
link|đường dẫn
search|tìm kiếm
click|nhấp chuột
download|tải xuống
upload|tải lên
file|tệp
folder|thư mục
photo|ảnh chụp
video|video
camera|máy ảnh
microphone|micro
speaker|loa
headphones|tai nghe
charger|bộ sạc
battery|pin
signal|tín hiệu
Wi-Fi|mạng Wi-Fi
printer|máy in
email|thư điện tử
contact|liên hệ
social media|mạng xã hội
`,
  },
  {
    id: 'emotions',
    title: 'Cảm xúc và tính cách',
    entries: `
happy|vui vẻ
sad|buồn
angry|tức giận
upset|khó chịu
excited|hào hứng
bored|chán
tired|mệt
nervous|lo lắng
afraid|sợ
scared|hoảng sợ
worried|bồn chồn
calm|bình tĩnh
relaxed|thư thái
surprised|ngạc nhiên
proud|tự hào
shy|nhút nhát
kind|tốt bụng
friendly|thân thiện
polite|lịch sự
rude|thô lỗ
honest|thật thà
funny|hài hước
serious|nghiêm túc
lazy|lười biếng
active|năng động
brave|dũng cảm
careful|cẩn thận
careless|bất cẩn
patient|kiên nhẫn
impatient|thiếu kiên nhẫn
quiet|yên lặng
loud|ồn ào
smart|thông minh
clever|lanh lợi
helpful|hay giúp đỡ
selfish|ích kỷ
generous|hào phóng
confident|tự tin
lonely|cô đơn
jealous|ghen tị
`,
  },
  {
    id: 'verbs-one',
    title: 'Động từ thông dụng 1',
    entries: `
be|thì, là, ở
have|có
do|làm
go|đi
come|đến
get|nhận được
make|tạo ra
take|lấy
give|đưa
put|đặt
keep|giữ
let|để cho
say|nói
tell|kể
ask|hỏi
know|biết
think|nghĩ
understand|hiểu
remember|nhớ
forget|quên
see|nhìn thấy
look|nhìn
watch|xem
hear|nghe thấy
listen|lắng nghe
feel|cảm thấy
want|muốn
need|cần
like|thích
love|yêu
hate|ghét
prefer|thích hơn
choose|chọn
find|tìm thấy
use|sử dụng
try|thử
help|giúp đỡ
start|bắt đầu
finish|hoàn thành
stop|dừng lại
continue|tiếp tục
call|gọi
`,
  },
  {
    id: 'verbs-two',
    title: 'Động từ thông dụng 2',
    entries: `
open|mở
close|đóng
begin|bắt đầu
end|kết thúc
move|di chuyển
turn|xoay
carry|mang
bring|mang đến
send|gửi
receive|nhận
build|xây dựng
break|làm vỡ
fix|sửa
repair|sửa chữa
drive|lái xe
ride|đi bằng xe
fly|bay
walk|đi bộ
run|chạy
jump|nhảy
climb|leo
fall|ngã
sit|ngồi
stand|đứng
lie|nằm
stay|ở lại
live|sống
grow|phát triển
change|thay đổi
happen|xảy ra
become|trở thành
cut|cắt
pull|kéo
push|đẩy
hold|cầm
catch|bắt
throw|ném
win|chiến thắng
lose|thua
pass|đi qua
miss|nhỡ
follow|đi theo
`,
  },
  {
    id: 'adjectives',
    title: 'Tính từ thông dụng',
    entries: `
big|to
small|nhỏ
tall|cao
short|thấp
long|dài
wide|rộng
narrow|hẹp
heavy|nặng
light|nhẹ
old|già, cũ
young|trẻ
new|mới
modern|hiện đại
ancient|cổ xưa
good|tốt
bad|xấu
better|tốt hơn
best|tốt nhất
worse|tệ hơn
worst|tệ nhất
beautiful|đẹp
ugly|xấu xí
pretty|xinh xắn
handsome|đẹp trai
clean|sạch
dirty|bẩn
easy|dễ
difficult|khó
hard|cứng, khó
soft|mềm
strong|mạnh
weak|yếu
fast|nhanh
slow|chậm
quick|nhanh chóng
full|đầy
empty|trống rỗng
rich|giàu
poor|nghèo
useful|hữu ích
`,
  },
  {
    id: 'directions',
    title: 'Phương hướng và vị trí',
    entries: `
north|phía bắc
south|phía nam
east|phía đông
west|phía tây
left|bên trái
right|bên phải
straight|thẳng
near|gần
far|xa
behind|phía sau
in front of|phía trước
next to|bên cạnh
between|ở giữa
beside|kế bên
across|băng qua
through|xuyên qua
along|dọc theo
around|xung quanh
toward|hướng về phía
above|ở phía trên
below|ở phía dưới
under|bên dưới
over|ở phía trên
inside|bên trong
outside|bên ngoài
up|lên
down|xuống
into|vào trong
onto|lên trên
from|từ
to|đến
by|gần, cạnh
with|với
without|không có
opposite|đối diện
`,
  },
  {
    id: 'objects',
    title: 'Đồ vật và chất liệu',
    entries: `
tool|dụng cụ
machine|máy móc
device|thiết bị
box|cái hộp
container|đồ đựng
bag|cái túi
can|cái lon
jar|lọ thủy tinh
lid|nắp
label|nhãn
rope|dây thừng
string|sợi dây
wire|dây kim loại
metal|kim loại
wood|gỗ
plastic|nhựa
cardboard|bìa các tông
fabric|vải
cotton|bông
wool|len
leather|da thuộc
stone|đá
brick|gạch
concrete|bê tông
steel|thép
gold|vàng
silver|bạc
iron|sắt
rubber|cao su
cloth|vải
material|vật liệu
shape|hình dạng
circle|hình tròn
square|hình vuông
line|đường thẳng
surface|bề mặt
edge|cạnh
`,
  },
  {
    id: 'connectors',
    title: 'Từ nối và từ bổ trợ',
    entries: `
and|và
but|nhưng
or|hoặc
so|vì vậy
because|bởi vì
although|mặc dù
if|nếu
unless|trừ khi
however|tuy nhiên
therefore|do đó
also|cũng
too|cũng
very|rất
quite|khá
almost|gần như
already|đã rồi
still|vẫn
just|vừa mới
even|thậm chí
only|chỉ
together|cùng nhau
alone|một mình
really|thật sự
perhaps|có lẽ
probably|có thể
especially|đặc biệt
first|đầu tiên
finally|cuối cùng
next|tiếp theo
then|sau đó
than|hơn
as|như
whether|liệu rằng
both|cả hai
each|mỗi
`,
  },
];

export const BASIC_COURSE_ID = 'basic-1000';
export const BASIC_COURSE_TITLE = '1000 từ cơ bản';

export const BASIC_COURSE_LESSONS: BasicCourseLesson[] = rawLessons.map(lesson => ({
  id: lesson.id,
  title: lesson.title,
  words: lesson.entries.trim().split('\n').filter(Boolean).map((row, index) => {
    const divider = row.indexOf('|');
    if (divider < 1) throw new Error(`Dữ liệu khóa học không hợp lệ: ${lesson.id}`);
    return {
      id: `${lesson.id}:${index + 1}`,
      term: row.slice(0, divider).trim(),
      meaning: row.slice(divider + 1).trim(),
    };
  }),
}));

export const BASIC_COURSE_WORD_COUNT = BASIC_COURSE_LESSONS.reduce((sum, lesson) => sum + lesson.words.length, 0);
