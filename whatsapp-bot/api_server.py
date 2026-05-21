from flask import Flask, request, jsonify
from whatsapp_bot import WhatsAppWebBot
import threading

app = Flask(__name__)
bot = None
bot_lock = threading.Lock()


def create_bot():
    global bot
    try:
        if bot is not None:
            try:
                bot.close()
            except Exception:
                pass
    except Exception:
        pass
    bot = WhatsAppWebBot()
    bot.ensure_logged_in()
    return bot


def get_bot():
    global bot
    with bot_lock:
        if bot is None:
            return create_bot()
        try:
            bot.driver.current_url
            return bot
        except Exception:
            return create_bot()


@app.route("/send", methods=["POST"])
def send_message():
    data = request.get_json()

    if not data or "phone" not in data or "message" not in data:
        return jsonify({"success": False, "message": "phone ve message alanlari gerekli."}), 400

    phone = data["phone"]
    message = data["message"]

    try:
        whatsapp_bot = get_bot()
        result = whatsapp_bot.send_message(phone, message)
        status_code = 200 if result["success"] else 500
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({"success": False, "message": f"Sunucu hatasi: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "WhatsApp Bot API calisiyor."})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
