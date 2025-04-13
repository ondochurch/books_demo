import json
import csv

# File paths (update as needed)
json_path = 'books_data.json'
csv_path = 'reviews.csv'
output_path = 'books_data_with_reviews.json'

# Step 1: Load the book JSON data
with open(json_path, 'r', encoding='utf-8') as f:
    book_data = json.load(f)

books = book_data.get("books", [])

# Step 2: Build a lookup for the books based on "author, title"
book_lookup = {
    f"{book['author'].split(',')[0].strip()}, {book['title'].strip()}": book
    for book in books
}

# Step 3: Read reviews from the CSV
with open(csv_path, newline='', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if not row or len(row) < 3:
            continue  # skip empty or invalid rows

        key = row[0].strip()  # "author, title"
        if key in book_lookup:
            reviews = []
            for i in range(1, len(row), 2):
                if i + 1 < len(row):
                    reviewer = row[i].strip()
                    text = row[i + 1].strip()
                    if reviewer and text:
                        reviews.append({
                            "author": reviewer,
                            "text": text
                        })
            if reviews:
                book_lookup[key]["reviews"] = reviews
        else:
            print(f'{key} not found in book data. Skipping review addition.')

# Step 4: Write the updated JSON
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(book_data, f, indent=2, ensure_ascii=False)

print(f"Updated JSON with reviews saved to {output_path}")
