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
OUTPUT_DIR = 'aladin_book_data'
DELAY = 2  # 요청 간 지연 시간(초)

def sanitize_filename(filename):
    """파일명에서 유효하지 않은 문자 제거"""
    return re.sub(r'[\\/*?:"<>|]', '', filename).strip()

def extract_book_metadata(book_str):
    """책 문자열에서 저자와 제목 분리"""
    match = re.match(r"(.+?),\s*《(.+?)》", book_str)
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

def extract_description(soup):
    """정확한 책소개 내용 추출: 모든 '책소개' 섹션 중 첫 번째 실제 내용"""
    try:
        # 모든 '책소개' 제목 찾기
        intro_titles = soup.find_all('div', class_='Ere_prod_mconts_LS')
        book_intro_title = None
        
        # 텍스트가 '책소개'인 제목 찾기
        for title in intro_titles:
            print(title)
            if title.get_text(strip=True) == '책소개':
                book_intro_title = title
                break
        
        if not book_intro_title:
            return "책소개 섹션을 찾을 수 없습니다."
        
        # 다음 형제 요소들 중에서 실제 내용이 있는 첫 번째 div 찾기
        next_sibling = book_intro_title.next_sibling
        while next_sibling:
            if next_sibling.name == 'div' and 'Ere_prod_mconts_R' in next_sibling.get('class', []):
                # 불필요한 요소 제거
                for elem in next_sibling.select('.Ere_subtitle, .Ere_prod_Title, script, style, .Ere_addinfo'):
                    elem.decompose()
                
                # 텍스트 추출 및 정리
                description = '\n\n'.join(
                    p.get_text().strip() for p in next_sibling.find_all(['p', 'div'])
                    if p.get_text().strip()
                )
                return description if description else "책소개 내용이 비어 있습니다."
            
            next_sibling = next_sibling.next_sibling
        
        return "책소개 내용을 찾을 수 없습니다."
    except Exception as e:
        print(f"설명 추출 오류: {str(e)[:100]}")
        return "책소개 추출 중 오류가 발생했습니다."

def extract_book_data(detail_url):
    """상세페이지에서 책 데이터 추출"""
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
        
        # 책 소개 추출
        description = extract_description(soup)
        
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
    books = list(set([
        "필립 얀시, 《내가 알지 못했던 예수》",
        "맥스 루케이도, 《하나님이 캐스팅한 사람》",
        # ... 기타 책 목록 추가 ...
    ]))
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