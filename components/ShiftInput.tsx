import React, { useRef, useEffect, useState } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import { registerRenderer, textRenderer } from 'handsontable/renderers';
import 'handsontable/dist/handsontable.full.min.css';
import {
    Box,
    Button,
} from "@chakra-ui/react";
import { db } from "../firebase/firebase";
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';

// Handsontableを使うための記述
registerAllModules();

const ShiftInput = (props: any) => {
    // props
    const { modalId } = props;
    // Handsontableを使うための記述
    const hotRef = useRef<HotTable>(null);
    // テーブル本体を構成する多次元配列を格納するためのuseState
    const [shiftTableData, setShiftTableData] = useState<any[][]>([]);
    // シフトの初期値を反映するための処理
    const [ shiftDefaultData, setShiftDefaultData ] = useState<any>([]);


    // 日付の配列を作成する (すでに登録されているシフトデータを反映するために使う)
    const getClassDateRangeArrayForDefault = async () => {
        const dateRef = collection(db, 'date');
        const querySnapshot = await getDocs(dateRef);
        const docsDateData = querySnapshot.docs.map((doc)=>{
            return doc.id;
        });
        return docsDateData;
    }

    // すでに登録されているシフトデータを反映するための2次元配列を作成する関数
    const createShiftDefaultDataMatrix = async (staffData: any) =>{
        const shiftData: any = [];
        if (staffData && staffData.shift) {
            // シフトを構成するデータを取得する (Firestoreから取得したシフトデータの座標を調べるため)
            const classDateRangeArray = await getClassDateRangeArrayForDefault();
            const classTimeArray = await getTimeArray();
            // awaitを使うためにfor文を使ってループさせる
            for (const value of Object.values<any>(staffData.shift)) {
                // リファレンスからドキュメントのデータを取得
                const timeRef = doc(db, 'time', value.time.id);
                const timeDoc = await getDoc(timeRef);
                const timeData = timeDoc.data();
                // 時限と講習期間がシフトを構成する配列の何番目なのかを取得
                const dateIndex = classDateRangeArray.indexOf(value.date.id) + 1;
                const timeIndex = classTimeArray.indexOf(timeData?.name) + 1;
                // シフト表を構成するデータを2次元配列に追加
                shiftData.push([dateIndex, timeIndex]);
            }
        }
        return shiftData;
    }

    // すでに登録されているシフト情報の取得
    const getShiftData = async () => {
        // 特定のスタッフのデータをFirestoreから取得
        const Ref = doc(db, 'staff', modalId);
        const querySnapshot = await getDoc(Ref);
        const staffData = querySnapshot.data();
        // 取得したデータからシフトデータを反映するための2次元配列を作成する
        const defaultShiftData = await createShiftDefaultDataMatrix(staffData);
        // シフトデータをuseStateにセット
        setShiftDefaultData(defaultShiftData);
    }

    // すでに登録されているシフト情報の取得を実行
    useEffect(()=>{
        getShiftData();
    },[modalId]);


    // 上記の関数で取得した、すでに登録されているシフトデータをテーブルに反映するための処理
    useEffect(()=>{
        if (hotRef.current) {
        const hot = hotRef.current.hotInstance;
        if (hot == null) return;
        shiftDefaultData.map(([x,y]: [number, number])=>{
            hot.setDataAtCell(x, y, "-");
            hot.setCellMeta(x, y, 'className', 'bg-change-2');
        });
        }
    },[shiftDefaultData]);


    // 日付の配列を作成する (シフト表本体の配列を作成するために使う)
    const getDateArray = async () => {
        // Firestoreからdateコレクションのドキュメントを取得する
        const dateRef = collection(db, 'date');
        const querySnapshot = await getDocs(dateRef);
        // dateコレクションのドキュメントIDが日付になっているため、形式を変更して配列に格納する
        const docsDateData = querySnapshot.docs.map((doc: any) => {
            // 日付から曜日を取得する
            const date = new Date(doc.id);
            const dayOfWeek = date.getDay();
            const dayOfWeekString = ['日', '月', '火', '水', '木', '金', '土'][dayOfWeek];
            // 年数を除いて月と日だけの形式に変更する
            const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日`;
            // 日付と曜日を結合して返す
            return formattedDate + ' (' + dayOfWeekString + ')';
        });
        return docsDateData;
    };

    // 時間帯の配列を作成する (シフト表本体の配列を作成するために使う)
    const getTimeArray = async () => {
        // Firestoreからtimeコレクションのドキュメントを取得する
        const timeRef = collection(db, 'time');
        const timeQuerySnapshot = await getDocs(timeRef);
        // timeコレクションのドキュメントのnameフィールドの値を配列に格納する
        const timeDocsData = timeQuerySnapshot.docs.map((doc: any) => {
            return doc.data().name;
        });
        // その配列をリターンする
        return timeDocsData;
    }

    // 2つの配列の値を行と列にして多次元配列を作成するための関数
    const createMatrix = (arrayA: any, arrayB: any) => {
        const numRows = arrayA.length + 1;
        const numCols = arrayB.length + 1;
        const result = new Array(numRows);
        // 空の2次元配列を作成
        for (let i = 0; i < numRows; i++) {
            result[i] = new Array(numCols).fill('');
        }
        // 1列目に配列Aのデータを配置
        for (let i = 1; i < numRows; i++) {
            result[i][0] = arrayA[i - 1];
        }
        // 1行目に配列Bのデータを配置
        for (let j = 1; j < numCols; j++) {
            result[0][j] = arrayB[j - 1];
        }
        return result;
    };

    // 1列目が日付で1行目が時間帯なっている多次元配列を作成する
    const createDataArray = async () => {
        const dateArray = await getDateArray();
        const timeArray = await getTimeArray();
        const matrix = createMatrix(dateArray, timeArray);
        setShiftTableData(matrix as any);
    }

    // 配列の作成を実行
    useEffect(()=>{
        createDataArray();
    },[hotRef]);


    // 選択されたセルの色を変更するための処理
    const changeSelectedCellsColor = async () => {
        if (hotRef.current) {
            const hot = hotRef.current.hotInstance;
            if (hot !== null) {
                hot.addHook('afterSelectionEnd', (row1, col1, row2, col2) => {
                const startRow = Math.min(row1, row2);
                const endRow = Math.max(row1, row2);
                const startCol = Math.min(col1, col2);
                const endCol = Math.max(col1, col2);
                hot.suspendRender();
                for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
                    for (let columnIndex = startCol; columnIndex <= endCol; columnIndex++) {
                        const currentData = hot.getDataAtCell(rowIndex, columnIndex);
                        const currentClassName = hot.getCellMeta(rowIndex, columnIndex).className;
                        // 1列目と1行目のセルは変更できないようにする
                        if (rowIndex !== 0 && columnIndex !== 0) {
                            // セルの値を変化させないと背景色が変化しないため、セルの値も変化させる
                            // 選択されたときのセルの値は-としているが、CSSで文字の色と背景色を同じにしているのでユーザーには見えない
                            if (currentData === '-' && currentClassName === 'bg-change') {
                                // すでに選択されているセルが再度選択された場合は元に戻す
                                hot.setDataAtCell(rowIndex, columnIndex, ''); // 元のデータに戻す
                                hot.setCellMeta(rowIndex, columnIndex, 'className', ''); // 背景色を元に戻す
                            } else {
                                hot.setDataAtCell(rowIndex, columnIndex, '-');
                                hot.setCellMeta(rowIndex, columnIndex, 'className', 'bg-change');
                            }
                        }
                    }
                }
                hot.resumeRender();
                });
            }
        }
    }

    // 選択されたセルの色を変更するための処理を実行
    useEffect(() => {
        changeSelectedCellsColor();
    }, [hotRef]);


    // 日付のリファレンスの配列を作成する (Firestoreに講師のシフト情報を保存するときに使う)
    const getClassDateRangeRefArray = async () => {
        const dateRangeRef = collection(db, 'date');
        const querySnapshot = await getDocs(dateRangeRef);
        const docsDateData = querySnapshot.docs.map((doc: any) => {
            return doc.ref.path;
        });
        return docsDateData;
    }


    // 時間帯のリファレンスの配列を作成する (Firestoreに講師のシフト情報を保存するときに使う)
    const getClassTimeRefArray = async () => {
        const timeRef = collection(db, 'time');
        const timeQuerySnapshot = await getDocs(timeRef);
        const timeDocsData = timeQuerySnapshot.docs.map((doc: any) => {
            return doc.ref.path;
        });
        return timeDocsData;
    }

    // シフトデータのセル座標を講習期間と時限のリファレンスに変更する
    const convertShiftDataToReferencedFormat = async (
        ShiftArray: any,
        dateRefArray: any,
        timeRefArray: any
    ) => {
        const referencedFormatShiftArray: any = [];
        ShiftArray.map((doc: any)=>{
            referencedFormatShiftArray.push({
                id: `${doc.row as number}_${doc.col as number}`,
                time : timeRefArray[doc.col as number - 1],
                date : dateRefArray[doc.row as number - 1],
            });
        });
        return referencedFormatShiftArray;
    }

    // シフトデータを登録する前に既存のシフトデータを削除する処理 (これをやらないと選択を解除したシフトが消えない)
    const beforeShiftDataDelete = async (staffId: any) => {
        // ドキュメントがすでに存在するかどうかを判別する
        const docRef = doc(db, "staff", staffId);
        const docSnap = await getDoc(docRef);
        // ドキュメントが存在していた場合はシフトデータを削除する (ドキュメントが存在していない場合にこれをやるとエラーになる)
        if (docSnap.exists()) {
            await updateDoc(doc(db, "staff", staffId), {
                shift : deleteField(),
            });
        }
    }

    // 実際にシフトデータを登録する処理
    const storeShiftData = async (staffId: any, ShiftArray: any) => {
        for (let i = 0; i < ShiftArray.length; i++) {
            // 文字列になっているパスからドキュメントのリファレンスを取得する
            const timeRefPath = ShiftArray[i].time;
            const dateRefPath = ShiftArray[i].date;
            const timeRefPathSegments = timeRefPath.split('/');
            const dateRefPathSegments = dateRefPath.split('/');
            // リファレンスのパスからIDを取得して、そのIDからドキュメントのリファレンスを取得する
            const timeRef = doc(db, "time", timeRefPathSegments[1]);
            const dateRef = doc(db, "date", dateRefPathSegments[1]);
            // updateDocを使うとfor文の繰り返しごとに1つのフィールドにシフトが上書きされるのでsetDocとmergeオプションを使う
            await setDoc(doc(db, "staff", staffId), {
                shift : {
                    [ShiftArray[i].id] : {
                        time : timeRef,
                        date : dateRef,
                    },
                }
            }, { merge: true });
        }
    }

    // Firestoreにスタッフのシフトを保存するための関数
    const saveShift = async (ShiftArray: any) => {
        // 日付と時間帯のリファレンスを配列として取得
        const dateRefPathArray = await getClassDateRangeRefArray();
        const timeRefPathArray = await getClassTimeRefArray();
        // セルの座標を日付と時間帯のリファレンスに変更する
        const referencedFormatShiftArray =
            await convertShiftDataToReferencedFormat(ShiftArray, dateRefPathArray, timeRefPathArray);
        // 選択が解除されたセルのシフト情報を削除するために一旦Shiftフィールドを消してから再度登録する
        await beforeShiftDataDelete(modalId);
        // リファレンス形式になったシフト情報を保存する
        await storeShiftData(modalId, referencedFormatShiftArray).then(()=>{
            console.log("Document successfully updated!");
        });
    }

    // 選択されて色が変わっているセルの情報を取得してFirestoreに保存する
    const saveSelectedCellsToFirestore = () => {
        const selectedCells = [];
        if (hotRef.current) {
            const hotInstance = hotRef.current.hotInstance;
            if (hotInstance) {
                const rowCount = hotInstance.countRows();
                const colCount = hotInstance.countCols();
                for (let row = 0; row < rowCount; row++) {
                    for (let col = 0; col < colCount; col++) {
                        const cellValue = hotInstance.getDataAtCell(row, col);
                        // 選択されているセルは値が-になっているかどうかで見分ける
                        if (cellValue === '-') {
                            selectedCells.push({ row, col });
                        }
                    }
                }
            }
        }
        saveShift(selectedCells);
    };


    return (
        <Box>
            <Box>
                {modalId}
            </Box>
            <HotTable
                ref={hotRef}
                data={shiftTableData}
                width="auto"
                colWidths={100}
                rowHeights={10}
                rowHeaders={false}
                colHeaders={false}
                outsideClickDeselects={false}
                selectionMode="multiple"
                licenseKey="non-commercial-and-evaluation"
                readOnly
                cells={(row: number, column: number, prop: string | number)=>{
                    const cellProperties: any = {};
                    // 初期値として選択されているセルを選択すると他のセルの色が消える問題を解決するために、セルの値が-になっているセルだけ色を変更する
                    if (shiftTableData[row][column] === '-') {
                        cellProperties.className = 'bg-change';
                    }
                    return cellProperties;
                }}
            />
            <Box>
                <Button onClick={saveSelectedCellsToFirestore} m={4}>シフトを保存する</Button>
            </Box>
        </Box>
    );
}

export default ShiftInput;

