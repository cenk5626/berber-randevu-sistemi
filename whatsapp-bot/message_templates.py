def get_confirmation_message(customer_name, date, time, service):
    message = (
        f"Sayin {customer_name},\n\n"
        f"Randevunuz onaylanmistir.\n\n"
        f"Tarih: {date}\n"
        f"Saat: {time}\n"
        f"Hizmet: {service}\n\n"
        f"Bizi tercih ettiginiz icin tesekkur ederiz.\n"
        f"Iyi gunler dileriz."
    )
    return message


def get_reminder_message(customer_name, date, time):
    message = (
        f"Sayin {customer_name},\n\n"
        f"Yaklasan randevunuzu hatirlatmak isteriz.\n\n"
        f"Tarih: {date}\n"
        f"Saat: {time}\n\n"
        f"Sizi aramizda gormekten memnuniyet duyariz.\n"
        f"Iyi gunler dileriz."
    )
    return message


def get_cancellation_message(customer_name, date, time):
    message = (
        f"Sayin {customer_name},\n\n"
        f"{date} tarihli, saat {time}'deki randevunuz iptal edilmistir.\n\n"
        f"Yeni bir randevu almak icin bizimle iletisime gecebilirsiniz.\n"
        f"Iyi gunler dileriz."
    )
    return message
