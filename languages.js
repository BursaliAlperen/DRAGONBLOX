const translations = {
    en: {
        loading: "Loading...",
        // Navigation
        nav_main_menu: "Main Menu",
        nav_shop: "Shop",
        nav_inventory: "Inventory",
        nav_upgrade: "Upgrade",
        nav_convert: "Convert",
        // Main Page
        collect_eggs: "Collect Eggs",
        egg_rate_prefix: "Eggs/s: ",
        no_dragon_equipped: "Select a dragon from your inventory.",
        // Shop
        shop_title: "Shop",
        shop_owned: "Owned",
        shop_buy: "Buy",
        shop_yield: "Yield: {rate}/s",
        shop_price: "Price: {price} Eggs",
        // Inventory
        inventory_title: "Inventory",
        inventory_empty: "You have no dragons. Buy one from the shop!",
        inventory_equip: "Equip",
        inventory_equipped: "Equipped",
        // Upgrades
        upgrades_title: "Upgrades",
        upgrade_current_dragon: "Upgrade Your Current Dragon",
        level_prefix: "Level: ",
        upgrade_cost_prefix: "Upgrade Cost: ",
        upgrade_button: "Upgrade",
        // Convert
        convert_title: "Convert Eggs to Robux",
        conversion_rate: "1 Robux = {cost} Eggs",
        convert_note: "Note: The cost will increase after each conversion.",
        convert_all_button: "Convert All",
        // Withdraw Modal
        withdraw_robux_title: "Withdraw Robux",
        withdraw_min_amount: "Minimum withdrawal is 50 Robux.",
        withdraw_gamepass_info: "You need to create a <a href='#' id='gamepass-info-link' class='how-to-link'>Gamepass</a> to withdraw.",
        gamepass_link: "Gamepass",
        withdraw_placeholder_amount: "Amount (min 50)",
        withdraw_placeholder_url: "Your Gamepass Link",
        withdraw_button: "Submit Withdrawal Request",
        withdraw_sending: "Sending...",
        // Gamepass Info Modal
        gamepass_tutorial_title: "How to Create a Gamepass",
        gamepass_tutorial_steps: `
            <p style="text-align: left; margin-bottom: 1rem;">
                To withdraw Robux, you need to create a Gamepass for the amount you want to withdraw and paste its link in the corresponding field. For example, to withdraw 50 Robux, you must create a Gamepass worth 50 Robux.
            </p>
            <p style="text-align: left; margin-bottom: 1rem;">
                <strong>Steps:</strong><br>
                1. Go to the Roblox website and click on the "Create" tab.<br>
                2. Select any "Experience" or create a new one.<br>
                3. On the experience page, go to "Associated Items" in the left menu.<br>
                4. Click on the "Passes" tab and press the "Create a Pass" button.<br>
                5. Fill in the required information and click "Create Pass".<br>
                6. Click on the Pass you created, and go to "Sales" in the left menu.<br>
                7. Activate the "Item for Sale" option and enter the Robux amount you want to withdraw in the "Price in Robux" field.<br>
                8. Save the changes and copy the link from your browser's address bar and paste it into the field in the application.
            </p>
        `,
        gamepass_commission_note: "Note: Roblox takes a 30% commission from Gamepass sales.",
        // Alerts & Indicators
        alert_not_enough_eggs: "You don't have enough eggs to buy this dragon!",
        alert_conversion_not_enough: "You don't have enough eggs to convert (at least {cost} required).",
        alert_robux_gained: "You gained {amount} Robux!",
        alert_withdraw_min_amount: "You can withdraw a minimum of 50 Robux.",
        alert_withdraw_invalid_url: "Please enter a valid Gamepass link.",
        alert_withdraw_not_enough_robux: "You don't have enough Robux to withdraw that amount.",
        alert_withdraw_success: "Withdrawal request for {amount} Robux has been successfully sent! Your payment will be processed within 24-72 hours.",
        alert_withdraw_server_error: "A server error occurred while sending the withdrawal request (Error: {status}). Please try again later.",
        alert_withdraw_network_error: "A network error occurred while sending the withdrawal request. Please check your internet connection and try again.",
        offline_earnings_alert: "You earned {amount} eggs while you were away!",
        saving_indicator_saving: "Saving...",
        saving_indicator_saved: "Saved!",
        saving_indicator_error: "Save Error!",
        // Dragon Names
        dragons: {
            red_dragon: 'Red Dragon',
            blue_dragon: 'Ice Dragon',
            green_dragon: 'Nature Dragon',
            bee_dragon: 'Bee Dragon',
            purple_dragon: 'Storm Dragon',
            gold_dragon: 'Gold Dragon',
            snake_dragon: 'Snake Dragon',
            shadow_dragon: 'Shadow Dragon',
            cosmic_dragon: 'Cosmic Dragon',
            phantom_dragon: 'Phantom Dragon',
            sun_dragon: 'Sun Dragon'
        }
    },
    tr: {
        loading: "Yükleniyor...",
        // Navigation
        nav_main_menu: "Ana Menü",
        nav_shop: "Dükkan",
        nav_inventory: "Envanter",
        nav_upgrade: "Yükselt",
        nav_convert: "Çevir",
        // Main Page
        collect_eggs: "Yumurtaları Topla",
        egg_rate_prefix: "Yumurta/s: ",
        no_dragon_equipped: "Envanterden bir ejderha seç.",
        // Shop
        shop_title: "Dükkan",
        shop_owned: "Sahipsin",
        shop_buy: "Satın Al",
        shop_yield: "Verim: {rate}/s",
        shop_price: "Fiyat: {price} Yumurta",
        // Inventory
        inventory_title: "Envanter",
        inventory_empty: "Hiç ejderhan yok. Dükkandan satın al!",
        inventory_equip: "Tak",
        inventory_equipped: "Takılı",
        // Upgrades
        upgrades_title: "Yükseltmeler",
        upgrade_current_dragon: "Mevcut Ejderhanı Yükselt",
        level_prefix: "Seviye: ",
        upgrade_cost_prefix: "Yükseltme Bedeli: ",
        upgrade_button: "Yükselt",
        // Convert
        convert_title: "Yumurtaları Robux'a Çevir",
        conversion_rate: "1 Robux = {cost} Yumurta",
        convert_note: "Not: Her çevirme sonrası bedel artacaktır.",
        convert_all_button: "Hepsini Çevir",
        // Withdraw Modal
        withdraw_robux_title: "Robux Çek",
        withdraw_min_amount: "Minimum 50 Robux çekilebilir.",
        withdraw_gamepass_info: "Çekim için bir <a href='#' id='gamepass-info-link' class='how-to-link'>Gamepass</a> oluşturmanız gerekmektedir.",
        gamepass_link: "Gamepass",
        withdraw_placeholder_amount: "Miktar (min 50)",
        withdraw_placeholder_url: "Gamepass Linkiniz",
        withdraw_button: "Çekim Talebi Gönder",
        withdraw_sending: "Gönderiliyor...",
        // Gamepass Info Modal
        gamepass_tutorial_title: "Gamepass Nasıl Oluşturulur?",
        gamepass_tutorial_steps: `
            <p style="text-align: left; margin-bottom: 1rem;">
                Robux çekebilmek için, çekeceğiniz miktar kadar bir Gamepass oluşturup linkini ilgili alana yapıştırmanız gerekir. Örneğin, 50 Robux çekmek için 50 Robux değerinde bir Gamepass oluşturmalısınız.
            </p>
            <p style="text-align: left; margin-bottom: 1rem;">
                <strong>Adımlar:</strong><br>
                1. Roblox'un web sitesine gidin ve "Create" (Oluştur) sekmesine tıklayın.<br>
                2. Herhangi bir "Experience" (Deneyim) seçin veya yeni bir tane oluşturun.<br>
                3. Deneyim sayfasında, sol menüden "Associated Items" (İlişkili Öğeler) seçeneğine gidin.<br>
                4. "Passes" sekmesine tıklayın ve "Create a Pass" butonuna basın.<br>
                5. Gerekli bilgileri doldurup "Create Pass" butonuna tıklayın.<br>
                6. Oluşturduğunuz Pass'e tıklayın, sol menüden "Sales" (Satış) seçeneğine gidin.<br>
                7. "Item for Sale" seçeneğini aktif edin ve çekeceğiniz Robux miktarını "Price in Robux" kısmına girin.<br>
                8. Değişiklikleri kaydedin ve tarayıcınızın adres çubuğundaki linki kopyalayıp uygulamadaki alana yapıştırın.
            </p>
        `,
        gamepass_commission_note: "Not: Roblox, Gamepass satışlarından %30 komisyon almaktadır.",
        // Alerts & Indicators
        alert_not_enough_eggs: "Bu ejderhayı satın almak için yeterli yumurtan yok!",
        alert_conversion_not_enough: "Çevirmek için yeterli yumurtan yok (en az {cost} gerekli).",
        alert_robux_gained: "{amount} Robux kazandın!",
        alert_withdraw_min_amount: "Minimum 50 Robux çekebilirsin.",
        alert_withdraw_invalid_url: "Lütfen geçerli bir Gamepass linki girin.",
        alert_withdraw_not_enough_robux: "Çekmek istediğin miktar kadar Robux'un yok.",
        alert_withdraw_success: "{amount} Robux çekme talebi başarıyla gönderildi! Ödemen 24-72 saat içinde yapılacaktır.",
        alert_withdraw_server_error: "Çekme talebi gönderilirken bir sunucu hatası oluştu (Hata: {status}). Lütfen daha sonra tekrar deneyin.",
        alert_withdraw_network_error: "Çekme talebi gönderilirken bir ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.",
        offline_earnings_alert: "Çevrimdışıyken {amount} yumurta kazandın!",
        saving_indicator_saving: "Kaydediliyor...",
        saving_indicator_saved: "Kaydedildi!",
        saving_indicator_error: "Kaydetme Hatası!",
        // Dragon Names
        dragons: {
            red_dragon: 'Kızıl Ejderha',
            blue_dragon: 'Buz Ejderhası',
            green_dragon: 'Doğa Ejderhası',
            bee_dragon: 'Arı Ejderhası',
            purple_dragon: 'Fırtına Ejderhası',
            gold_dragon: 'Altın Ejderha',
            snake_dragon: 'Yılan Ejderha',
            shadow_dragon: 'Gölge Ejderhası',
            cosmic_dragon: 'Kozmik Ejderha',
            phantom_dragon: 'Hayalet Ejderha',
            sun_dragon: 'Güneş Ejderhası'
        }
    }
};