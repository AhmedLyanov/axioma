import Axioma from "../src/index.js";

const client = new Axioma();

(async () => {
  
  const res1 = await client.query("Напиши функцию суммы на JavaScript");
  console.log("📝 Простой ответ:", res1);

  
  const res2 = await client.query("Создай React компонент кнопки", {
    model: "mistral",
    seed: 123,
    system: "You Senior Fullstack-Developer React, Vue, Angular, Fetch, API, REST API and more",
  });
  console.log("⚛️ React компонент:", res2);

  
  console.log("🚀 Запуск генерации кода из ТЗ...");
  await client.generateCodeFromTZ(".", "generated-code.js");
  
  console.log("✅ Все примеры выполнены!");
})();