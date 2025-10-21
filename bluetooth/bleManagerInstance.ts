import { BleManager } from 'react-native-ble-plx';

/**
 * アプリケーション全体で共有されるBleManagerの単一インスタンス。
 * このインスタンスをインポートして使用することで、
 * 複数のマネージャーが生成されることを防ぎます。
 */
export const bleManager = new BleManager();