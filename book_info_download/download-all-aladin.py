import requests
from bs4 import BeautifulSoup
import os
import json
import re
import time
from urllib.parse import urljoin

# 설정
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}
API_KEY = "ttbi.codex0753001"  # 알라딘에서 발급받은 API 키
OUTPUT_DIR = 'aladin_book_data'
DELAY = 2  # 요청 간 지연 시간(초)

def sanitize_filename(filename):
    """파일명에서 유효하지 않은 문자 제거"""
    return re.sub(r'[\\/*?:"<>|]', '', filename).strip()

def extract_book_metadata(book_str):
    """책 문자열에서 저자와 제목 분리"""
    return book_str.split(',', 1)
    match = re.match(r"(.+?),\s*(.+?)", book_str)
    return match.groups() if match else (None, None)

def search_aladin(author, title):
    """알라딘에서 책 검색하여 상세페이지 URL 반환"""
    search_url = "https://www.aladin.co.kr/search/wsearchresult.aspx"
    params = {
        'SearchTarget': 'Book',
        'SearchWord': f"{title} {author}",
        'x': '0',
        'y': '0'
    }
    
    try:
        response = requests.get(search_url, params=params, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        first_item = soup.select_one('a.bo3')
        return urljoin('https://www.aladin.co.kr/', first_item['href']) if first_item else None
    except Exception as e:
        print(f"검색 오류 ({title}): {str(e)[:100]}")
        return None

def get_description_from_api(isbn):
    """알라딘 API로부터 책 소개 추출"""
    api_url = "http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx"
    params = {
        'TTBKey': API_KEY,
        'ItemId': isbn,
        'ItemIdType': 'ISBN13',
        'Output': 'JS',
        'Version': '20131101',
        'OptResult': 'description'
    }
    
    try:
        response = requests.get(api_url, params=params)
        data = response.json()
        if 'item' in data and len(data['item']) > 0:
            return data['item'][0].get('description', '')
        return ''
    except Exception as e:
        print(f"API 요청 오류: {str(e)[:100]}")
        return ''

def extract_book_data(detail_url):
    """상세페이지에서 책 데이터 추출 (description은 API 사용)"""
    try:
        response = requests.get(detail_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 기본 정보 추출
        title = soup.select_one('meta[property="og:title"]')['content'].split(' - ')[0]
        author = soup.select_one('meta[name="author"]')['content']
        isbn = soup.select_one('meta[property="books:isbn"]')['content']
        
        # 500px 커버 이미지 URL 추출
        cover_url = None
        meta_image = soup.find('meta', property='og:image')
        if meta_image and 'cover500' in meta_image['content']:
            cover_url = meta_image['content']
        else:
            img_tag = soup.select_one('img.i_cover')
            if img_tag and 'src' in img_tag.attrs:
                cover_url = img_tag['src'].replace('cover150', 'cover500')
        
        # 책 소개는 API로 추출
        description = get_description_from_api(isbn)
        
        return {
            'title': title,
            'author': author,
            'isbn': isbn,
            'cover_url': cover_url,
            'description': description,
            'detail_url': detail_url
        }
    except Exception as e:
        print(f"데이터 추출 오류: {str(e)[:100]}")
        return None

def download_image(image_url, save_path):
    """이미지 다운로드 함수"""
    try:
        response = requests.get(image_url, headers=HEADERS, stream=True, timeout=10)
        if response.status_code == 200 and 'image' in response.headers.get('Content-Type', ''):
            with open(save_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return True
        return False
    except Exception as e:
        print(f"이미지 다운로드 실패: {str(e)[:100]}")
        return False

def main():
    # 책 목록 (중복 제거)
    books = [
        "C.S. 루이스, 스크루테이프의 편지",
        "RA 토레이, 평범함 속의 권능",
        "게르트 타이쎈, 갈릴래아 사람의 그림자",
        "고든 스미스, 온전한 성화",
        "김병수, 마흔, 마음공부를 시작했다",
        "김용규, 그리스도인은 왜 인문학을 공부해야하는가",
        "데이비드 깁슨, 인생 전도서를 읽다",
        "디트리히 본회퍼, 나를 따르라",
        "맥스 루케이도, 하나님이 캐스팅한 사람",
        "박상길, 비전공자도 이해할 수 있는 AI지식",
        "박영선, 믿음의 본질",
        "스탠리 하우어워스, 한나의 아이",
        "신재식, 예수와 다윈의 동행",
        "아더 핑크, 성화론",
        "알리스터 맥그래스, 기독교 변증",
        "알리스터 맥그래스, 신학이 무슨 소용이냐고 묻는이들에게",
        "우종학, 과학시대의 도전과 기독교의 응답",
        "워렌 위어스비, 하나님의 일꾼과 사역",
        "유발 하라리, 사피엔스",
        "유진 피터슨, 그 길을 걸으라",
        "이재철, 로마서",
        "제임스 패커, 하나님을 아는 지식", 
        "조병호, 성경과 5대 제국",
        "존 맥아더, 구원이란 무엇인가",
        "존 스토트, 살아있는 교회",
        "존 스토트, 성령세례와 충만",
        "존 스토트, 현대 사회 문제와 그리스도인의 책임",
        "주원준, 구약의 사람들",
        "짐 콜린스, 좋은 기업을 넘어 위대한 기업으로"
        "카를로 로벨리, 시간은 흐르지 않는다",
        "톰 라이트, 요한 계시록",
        "팀 켈러, 결혼을 말하다",
        "팀 켈러, 기도",
        "팀 켈러, 내가 만든 신",
        "필립 얀시, 내가 알지 못했던 예수",
        "필립 얀시, 아무도 말해주지 않았던 것들",
    ]
    books = list(set(books))
    books.sort()
    
    # 출력 폴더 생성
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 전체 데이터 저장할 딕셔너리
    all_books_data = {
        'metadata': {
            'source': 'Aladin',
            'collected_date': time.strftime("%Y-%m-%d"),
            'total_books': len(books)
        },
        'books': []
    }
    
    # 각 책 처리
    for idx, book in enumerate(books, 1):
        print(f"\n[{idx}/{len(books)}] 처리 시작: {book}")
        book_entry = {}
        
        # 1. 저자와 제목 분리
        author, title = extract_book_metadata(book)
        if not author or not title:
            print(">> 형식 오류: 저자 또는 제목을 추출할 수 없습니다.")
            continue
        
        # 2. 상세페이지 URL 획득
        detail_url = search_aladin(author, title)
        if not detail_url:
            print(">> 상세페이지를 찾을 수 없습니다.")
            continue
        
        # 3. 책 데이터 추출
        book_data = extract_book_data(detail_url)
        if not book_data:
            print(">> 책 데이터를 추출할 수 없습니다.")
            continue
        
        # 4. 이미지 다운로드
        safe_title = sanitize_filename(book_data['title'])
        safe_author = sanitize_filename(book_data['author'])
        img_filename = f"{idx:03d}_{safe_title}_{safe_author}.jpg"
        img_path = os.path.join(OUTPUT_DIR, img_filename)
        
        if book_data['cover_url']:
            if download_image(book_data['cover_url'], img_path):
                print(f">> 이미지 저장: {img_filename}")
                book_data['image_file'] = img_filename
            else:
                print(">> 이미지 다운로드 실패")
                book_data['image_file'] = None
        else:
            print(">> 커버 이미지 URL을 찾을 수 없음")
            book_data['image_file'] = None
        
        # 5. 데이터 구조에 추가
        all_books_data['books'].append(book_data)
        print(f">> 데이터 추가 완료: {book_data['title']}")
        print(f">> 책 소개 길이: {len(book_data['description'])}자")
        
        # 지연 처리
        time.sleep(DELAY)
    
    # JSON 파일로 저장
    json_path = os.path.join(OUTPUT_DIR, 'books_data.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_books_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n모든 처리가 완료되었습니다! 결과는 {json_path}에 저장되었습니다.")
    print(f"총 {len(all_books_data['books'])}/{len(books)}권의 데이터를 수집했습니다.")

if __name__ == "__main__":
    main()