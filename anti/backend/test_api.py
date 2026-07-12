import urllib.request
import urllib.error
import json

def test_api():
    login_url = "http://127.0.0.1:8000/api/token/"
    payload = json.dumps({
        "username": "surya",
        "password": "Surya@123"
    }).encode('utf-8')
    
    try:
        req = urllib.request.Request(
            login_url,
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            token = data.get("access")
    except Exception as e:
        print("Failed to log in:", e)
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("\nFetching page 1 of patterns...")
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/inventory/patterns/?page=1&page_size=10",
            headers=headers
        )
        with urllib.request.urlopen(req) as response:
            res_data = response.read()
            print("Response Length:", len(res_data))
            res = json.loads(res_data.decode('utf-8'))
            print("Count:", res.get("count"))
            print("Results count:", len(res.get("results", [])))
            for item in res.get("results", []):
                print(f" - {item.get('pattern_id')} (active: {item.get('is_active')})")
    except Exception as e:
        print("Failed to fetch patterns:", e)

if __name__ == "__main__":
    test_api()
