import React from 'react';
import './App.css'; // 作成したCSSファイルを読み込む

function App() {
  // 8時から22時までのタイムスロットを生成
  const timeSlots = [];
  for (let i = 8; i <= 22; i++) {
    timeSlots.push(`${i}:00 - ${i+1}:00`);
  }

  return (
    <div className="container">
      <h1>株式会社アイソニーフーズ業務日報</h1>

      <table className="header-table">
        <tbody>
          <tr>
            <td className="label">日付</td>
            <td><input type="date" /></td>
            <td className="label">始業時間</td>
            <td><input type="time" /></td>
            <td className="label">終業時間</td>
            <td><input type="time" /></td>
          </tr>
          <tr>
            <td className="label">部署名</td>
            <td><input type="text" /></td>
            <td className="label">氏名</td>
            <td colSpan="3"><input type="text" /></td>
          </tr>
        </tbody>
      </table>

      <table className="main-table">
        <thead>
          <tr>
            <th className="time-cell">時間</th>
            <th>業務内容</th>
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(slot => (
            <tr key={slot}>
              <td className="time-cell">{slot}</td>
              <td><textarea /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="notes-section">
        <label className="label">特記事項</label>
        <textarea />
      </div>

      <button className="submit-button">提出する</button>
    </div>
  );
}

export default App;