import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options


class WhatsAppWebBot:
    def __init__(self):
        self.session_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chrome_session")
        os.makedirs(self.session_dir, exist_ok=True)

        chrome_options = Options()
        chrome_options.add_argument("--user-data-dir=" + self.session_dir)
        chrome_options.add_argument("--profile-directory=Default")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-software-rasterizer")
        chrome_options.add_argument("--log-level=3")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-logging"])

        try:
            driver_path = ChromeDriverManager().install()
            service = Service(driver_path)
        except Exception:
            service = Service()

        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 30)

    def ensure_logged_in(self):
        self.driver.get("https://web.whatsapp.com")
        time.sleep(5)
        try:
            self.wait.until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, '[data-testid="chat-list"]')
                )
            )
            print("WhatsApp Web oturumu aktif.")
        except TimeoutException:
            print("QR kodu tarayin ve oturum acilana bekleyin...")
            try:
                self.wait.until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, '[data-testid="chat-list"]')
                    )
                )
                print("Oturum acildi.")
            except TimeoutException:
                print("Oturum acilamadi, yine de devam ediliyor...")

    def send_message(self, phone, message):
        try:
            clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
            url = f"https://web.whatsapp.com/send?phone={clean_phone}"
            self.driver.get(url)
            time.sleep(8)

            try:
                input_box = self.driver.find_element(
                    By.CSS_SELECTOR, 'div[contenteditable="true"][data-tab="10"]'
                )
                input_box.clear()
                input_box.send_keys(message)
                time.sleep(1)
                input_box.send_keys(Keys.RETURN)
                time.sleep(2)
                return {"success": True, "message": "Mesaj basariyla gonderildi."}
            except NoSuchElementException:
                pass

            try:
                input_box = self.driver.find_element(
                    By.CSS_SELECTOR, '[data-testid="textbox"]'
                )
                input_box.clear()
                input_box.send_keys(message)
                time.sleep(1)
                input_box.send_keys(Keys.RETURN)
                time.sleep(2)
                return {"success": True, "message": "Mesaj basariyla gonderildi."}
            except NoSuchElementException:
                pass

            return {"success": False, "message": "Mesaj kutusu bulunamadi. Numara hatali olabilir."}

        except WebDriverException as e:
            return {"success": False, "message": f"Chrome hatasi: {str(e)}"}
        except Exception as e:
            return {"success": False, "message": f"Hata olustu: {str(e)}"}

    def close(self):
        try:
            self.driver.quit()
        except Exception:
            pass
